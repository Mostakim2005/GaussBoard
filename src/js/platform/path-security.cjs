'use strict';

const path = require('node:path');

/** True only when target resolves to root itself or a child of root. */
function isPathWithin(root, target) {
  const base = path.resolve(root);
  const resolved = path.resolve(target);
  const relative = path.relative(base, resolved);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

module.exports = { isPathWithin };
