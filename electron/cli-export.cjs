'use strict';

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const zlib = require('node:zlib');
const { pathToFileURL } = require('node:url');

const CLI_FLAGS = new Set(['--inspect', '--export-md', '--export-canvas', '--help-cli']);
const ROOT_DIR = path.resolve(__dirname, '..');

class CliError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function hasCliFlags(argv) {
  return Array.isArray(argv) && argv.some((arg) => CLI_FLAGS.has(arg));
}

function parseCliArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(1) : [];
  let command = null;
  let input = null;
  let out = null;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--inspect') command = 'inspect';
    else if (a === '--export-md') command = 'export-md';
    else if (a === '--export-canvas') command = 'export-canvas';
    else if (a === '--help-cli') command = 'help';
    else if (a === '--json') json = true;
    else if (a === '--input' || a === '-i') {
      input = args[++i] || null;
    } else if (a.startsWith('--input=')) {
      input = a.slice('--input='.length);
    } else if (a === '--out' || a === '-o') {
      out = args[++i] || null;
    } else if (a.startsWith('--out=')) {
      out = a.slice('--out='.length);
    } else if (!a.startsWith('-') && !input) {
      const resolved = path.resolve(a);
      const isLauncherArg = i === 0 && (
        resolved === path.resolve(__filename)
        || resolved === path.resolve(ROOT_DIR, 'main.js')
        || resolved === ROOT_DIR
        || path.basename(a) === path.basename(__filename)
      );
      if (!isLauncherArg) {
        input = a;
      }
    }
  }

  return { command, input, out, json };
}

function readZipEntriesPureNode(buf) {
  // Locate End of Central Directory (0x06054b50)
  const minOffset = Math.max(0, buf.length - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new CliError('Invalid ZIP archive: End of Central Directory not found', 2);
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const entries = new Map();
  let ptr = cdOffset;

  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) {
      throw new CliError('Invalid ZIP central directory header', 2);
    }
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    entries.set(name, { name, method, compSize, localHeaderOffset });
  }

  const extractEntry = (entry) => {
    if (!entry) return null;
    const off = entry.localHeaderOffset;
    if (off + 30 > buf.length || buf.readUInt32LE(off) !== 0x04034b50) {
      throw new CliError(`Invalid ZIP local header for ${entry.name}`, 2);
    }
    const localNameLen = buf.readUInt16LE(off + 26);
    const localExtraLen = buf.readUInt16LE(off + 28);
    const dataStart = off + 30 + localNameLen + localExtraLen;
    const slice = buf.subarray(dataStart, dataStart + entry.compSize);
    if (entry.method === 0) return slice;
    if (entry.method === 8) return zlib.inflateRawSync(slice);
    throw new CliError(`Unsupported ZIP compression method (${entry.method}) for ${entry.name}`, 3);
  };

  return { entries, extractEntry };
}

async function readBoardArchive(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new CliError(`Board file not found: ${filePath || '(none)'}`, 2);
  }
  const buf = await fsp.readFile(filePath);
  const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04;

  if (isZip) {
    let JSZip = null;
    try {
      JSZip = require('jszip');
    } catch (err) {
      if (err && err.code !== 'MODULE_NOT_FOUND') throw new CliError(err.message, 1);
    }

    if (JSZip) {
      const zip = await JSZip.loadAsync(buf);
      const entry = zip.file('board.json');
      if (!entry) throw new CliError('Invalid .gaussboard archive: missing board.json', 2);
      const doc = JSON.parse(await entry.async('text'));
      const assets = Object.keys(zip.files || {})
        .filter((rel) => !zip.files[rel].dir && rel.startsWith('assets/'))
        .map((rel) => rel.slice('assets/'.length));
      return { doc, format: 'zip', assets };
    }

    const { entries, extractEntry } = readZipEntriesPureNode(buf);
    const boardEntry = entries.get('board.json');
    if (!boardEntry) throw new CliError('Invalid .gaussboard archive: missing board.json', 2);
    const doc = JSON.parse(extractEntry(boardEntry).toString('utf8'));
    const assets = [...entries.keys()]
      .filter((rel) => !rel.endsWith('/') && rel.startsWith('assets/'))
      .map((rel) => rel.slice('assets/'.length));
    return { doc, format: 'zip', assets };
  }

  try {
    const doc = JSON.parse(buf.toString('utf8'));
    return { doc, format: 'json', assets: [] };
  } catch (err) {
    throw new CliError(`Invalid JSON board file: ${err.message}`, 2);
  }
}

function objectListFromDoc(doc) {
  const raw = doc?.objects || {};
  return Array.isArray(raw) ? raw.filter(Boolean) : Object.values(raw).filter(Boolean);
}

function inspectBoard(doc, { inputPath = '', format = 'json', assets = [] } = {}) {
  const objs = objectListFromDoc(doc);
  const objectTypes = {};
  let studyCardCount = 0;
  let diagramCount = 0;
  let videoCount = 0;

  for (const o of objs) {
    const type = o.type || 'unknown';
    objectTypes[type] = (objectTypes[type] || 0) + 1;
    if (type === 'curtain') studyCardCount++;
    if (type === 'diagram' || (type === 'image' && o.subtype === 'visualization')) diagramCount++;
    if (type === 'video') videoCount++;
  }

  const audioTracks = Array.isArray(doc?.audioTracks)
    ? doc.audioTracks.map((t) => ({ id: t.id || null, name: t.name || null, durationMs: t.durationMs || 0 }))
    : [];
  const boardId = doc?.id || path.basename(String(inputPath || 'board'), path.extname(String(inputPath || '')));

  return {
    id: boardId,
    name: doc?.name || 'Untitled board',
    format,
    pageCount: Array.isArray(doc?.pages) ? doc.pages.length : 0,
    objectCount: objs.length,
    objectTypes,
    audioTrackCount: audioTracks.length,
    audioTracks,
    studyCardCount,
    diagramCount,
    videoCount,
    tags: Array.isArray(doc?.tags) ? doc.tags : [],
    deepLink: `gaussboard://open?board=${encodeURIComponent(String(boardId))}`,
    assets
  };
}

async function writeAtomicUtf8(targetPath, content) {
  const abs = path.resolve(targetPath);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, String(content || ''), 'utf8');
  await fsp.rename(tmp, abs);
  return abs;
}

function emitOutput(stream, payload, asJson) {
  const text = asJson ? JSON.stringify(payload) : (typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
  stream.write(text.endsWith('\n') ? text : `${text}\n`);
}

async function runCli(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  const parsed = parseCliArgs(argv);

  if (parsed.command === 'help') {
    const helpData = {
      ok: true,
      commands: ['--inspect', '--export-md', '--export-canvas'],
      flags: ['--input <path>', '--out <path>', '--json'],
      exitCodes: { 0: 'success', 1: 'runtime error', 2: 'invalid args or missing input', 3: 'missing dependency' }
    };
    emitOutput(stdout, parsed.json ? helpData : 'Usage: gaussboard (--inspect | --export-md | --export-canvas) --input <file> [--out <file>] [--json]', parsed.json);
    return 0;
  }

  if (!parsed.command || !parsed.input) {
    const msg = 'Missing required command (--inspect, --export-md, --export-canvas) or --input <board-file>';
    if (parsed.json) emitOutput(stdout, { ok: false, code: 2, error: msg }, true);
    else stderr.write(`${msg}\n`);
    return 2;
  }

  try {
    const inputPath = path.resolve(parsed.input);
    const { doc, format, assets } = await readBoardArchive(inputPath);
    const boardName = doc?.name || path.basename(inputPath, path.extname(inputPath));

    if (parsed.command === 'inspect') {
      const info = inspectBoard(doc, { inputPath, format, assets });
      emitOutput(stdout, parsed.json ? { ok: true, command: 'inspect', input: inputPath, data: info } : info, parsed.json);
      return 0;
    }

    if (parsed.command === 'export-md') {
      const { generateMarkdownSidecar } = await import(pathToFileURL(path.join(ROOT_DIR, 'src', 'js', 'core', 'markdown-sidecar.js')).href);
      const markdown = generateMarkdownSidecar(doc, boardName);
      let outputPath = null;
      if (parsed.out) {
        outputPath = await writeAtomicUtf8(parsed.out, markdown);
      }
      if (parsed.json) {
        emitOutput(stdout, {
          ok: true,
          command: 'export-md',
          input: inputPath,
          ...(outputPath ? { outputPath } : {}),
          data: { boardId: doc?.id || null, boardName, markdown }
        }, true);
      } else if (outputPath) {
        stdout.write(`${outputPath}\n`);
      } else {
        stdout.write(markdown.endsWith('\n') ? markdown : `${markdown}\n`);
      }
      return 0;
    }

    if (parsed.command === 'export-canvas') {
      const { exportToJsonCanvas } = await import(pathToFileURL(path.join(ROOT_DIR, 'src', 'js', 'core', 'json-canvas.js')).href);
      const canvas = exportToJsonCanvas(doc);
      const canvasText = JSON.stringify(canvas, null, 2);
      let outputPath = null;
      if (parsed.out) {
        outputPath = await writeAtomicUtf8(parsed.out, canvasText);
      }
      if (parsed.json) {
        emitOutput(stdout, {
          ok: true,
          command: 'export-canvas',
          input: inputPath,
          ...(outputPath ? { outputPath } : {}),
          data: canvas
        }, true);
      } else if (outputPath) {
        stdout.write(`${outputPath}\n`);
      } else {
        stdout.write(`${canvasText}\n`);
      }
      return 0;
    }

    return 2;
  } catch (err) {
    const code = Number.isInteger(err?.code) ? err.code : 1;
    const message = err?.message || String(err);
    if (parsed.json) emitOutput(stdout, { ok: false, code, error: message }, true);
    else stderr.write(`${message}\n`);
    return code;
  }
}

if (require.main === module) {
  runCli(process.argv).then((code) => process.exit(code));
}

module.exports = {
  hasCliFlags,
  parseCliArgs,
  readBoardArchive,
  inspectBoard,
  runCli
};
