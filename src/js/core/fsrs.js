/**
 * GazBoard - Free Spaced Repetition Scheduler (FSRS v5) Engine
 * Pure JavaScript, zero-dependency implementation of the DSR (Difficulty, Stability, Retrievability) model.
 * Spec: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

export const Rating = Object.freeze({
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4
});

export const State = Object.freeze({
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3
});

export const DEFAULT_FSRS_WEIGHTS = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, // w0-w3: Initial stability for ratings 1-4
  7.1949, 0.5345,                     // w4-w5: Initial difficulty
  1.4604, 0.0046,                     // w6-w7: Difficulty update
  1.54575, 0.1192, 1.01925,           // w8-w10: Stability update on recall
  1.9395, 0.11, 0.29605, 2.2698,      // w11-w14: Stability update on forget
  0.2315, 2.9898                      // w15-w16: Hard penalty & Easy bonus
]);

export const REQUEST_RETENTION = 0.90;
const FACTOR = 19 / 81; // ~0.2345679

/** Clamp helper */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Create a new blank card structure for a Study Tape or Answer Cover object */
export function createEmptyCard(now = Date.now()) {
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    last_review: null
  };
}

/** Retrieve or hydrate an FSRS card from a whiteboard object */
export function getCard(object) {
  if (object?.fsrs && typeof object.fsrs === 'object') {
    return {
      due: object.fsrs.due ?? Date.now(),
      stability: object.fsrs.stability ?? 0,
      difficulty: object.fsrs.difficulty ?? 0,
      elapsed_days: object.fsrs.elapsed_days ?? 0,
      scheduled_days: object.fsrs.scheduled_days ?? 0,
      reps: object.fsrs.reps ?? 0,
      lapses: object.fsrs.lapses ?? 0,
      state: object.fsrs.state ?? State.New,
      last_review: object.fsrs.last_review ?? null
    };
  }
  return createEmptyCard();
}

/** Calculate initial stability S0(G) */
function initStability(rating, w = DEFAULT_FSRS_WEIGHTS) {
  return Math.max(0.1, w[rating - 1] ?? w[2]);
}

/** Calculate initial difficulty D0(G) */
function initDifficulty(rating, w = DEFAULT_FSRS_WEIGHTS) {
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1.0, 10.0);
}

/** Calculate next difficulty D'(D, G) */
function nextDifficulty(d, rating, w = DEFAULT_FSRS_WEIGHTS) {
  const d0_3 = initDifficulty(Rating.Good, w);
  const nextD = w[7] * d0_3 + (1 - w[7]) * (d - w[6] * (rating - 3));
  return clamp(nextD, 1.0, 10.0);
}

/** Retrievability R(t, S) = (1 + Factor * (t / S))^(-0.5) */
export function calculateRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return Math.pow(1 + FACTOR * (elapsedDays / stability), -0.5);
}

/** Next stability on recall S'r */
function nextRecallStability(d, s, r, rating, w = DEFAULT_FSRS_WEIGHTS) {
  const hardPenalty = rating === Rating.Hard ? w[15] : 1.0;
  const easyBonus = rating === Rating.Easy ? w[16] : 1.0;
  return s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hardPenalty * easyBonus);
}

/** Next stability on forget S'f */
function nextForgetStability(d, s, r, w = DEFAULT_FSRS_WEIGHTS) {
  return w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
}

/** Interval in days from stability and requested retention */
function nextInterval(s, retention = REQUEST_RETENTION) {
  const i = (s / FACTOR) * (Math.pow(retention, -2) - 1);
  return Math.max(1, Math.round(i));
}

/**
 * Repeat an FSRS card with a given rating (Again, Hard, Good, Easy)
 * Returns the updated card record.
 */
export function repeat(card, rating, now = Date.now(), w = DEFAULT_FSRS_WEIGHTS) {
  const currentCard = { ...card };
  const elapsedDays = currentCard.last_review
    ? Math.max(0, (now - currentCard.last_review) / (86400 * 1000))
    : 0;

  let newStability = currentCard.stability;
  let newDifficulty = currentCard.difficulty;
  let newState = currentCard.state;
  let scheduledDays = 0;
  let newLapses = currentCard.lapses;

  if (currentCard.state === State.New) {
    // Initial learning step
    newStability = initStability(rating, w);
    newDifficulty = initDifficulty(rating, w);
    if (rating === Rating.Again) {
      newState = State.Learning;
      scheduledDays = 10 / 1440; // 10 minutes
      newLapses += 1;
    } else if (rating === Rating.Hard) {
      newState = State.Learning;
      scheduledDays = 1; // 1 day
    } else if (rating === Rating.Good) {
      newState = State.Review;
      scheduledDays = Math.max(1, Math.round(newStability));
    } else if (rating === Rating.Easy) {
      newState = State.Review;
      scheduledDays = Math.max(2, Math.round(newStability * 1.5));
    }
  } else if (currentCard.state === State.Learning || currentCard.state === State.Relearning) {
    if (rating === Rating.Again) {
      scheduledDays = 10 / 1440; // 10 minutes
      newLapses += 1;
    } else if (rating === Rating.Hard) {
      scheduledDays = 1;
    } else {
      newState = State.Review;
      newDifficulty = nextDifficulty(currentCard.difficulty, rating, w);
      newStability = initStability(rating, w);
      scheduledDays = nextInterval(newStability);
    }
  } else {
    // Review state
    const r = calculateRetrievability(elapsedDays, currentCard.stability);
    newDifficulty = nextDifficulty(currentCard.difficulty, rating, w);

    if (rating === Rating.Again) {
      newState = State.Relearning;
      newStability = nextForgetStability(newDifficulty, currentCard.stability, r, w);
      scheduledDays = 10 / 1440; // 10 minutes
      newLapses += 1;
    } else {
      newState = State.Review;
      newStability = nextRecallStability(newDifficulty, currentCard.stability, r, rating, w);
      scheduledDays = nextInterval(newStability);
      if (rating === Rating.Hard) {
        scheduledDays = Math.max(1, Math.round(scheduledDays * 0.7));
      } else if (rating === Rating.Easy) {
        scheduledDays = Math.max(scheduledDays + 1, Math.round(scheduledDays * 1.3));
      }
    }
  }

  const nextDue = Math.round(now + scheduledDays * 86400 * 1000);

  return {
    due: nextDue,
    stability: Number(newStability.toFixed(4)),
    difficulty: Number(newDifficulty.toFixed(4)),
    elapsed_days: Number(elapsedDays.toFixed(2)),
    scheduled_days: Number(scheduledDays.toFixed(4)),
    reps: currentCard.reps + 1,
    lapses: newLapses,
    state: newState,
    last_review: now
  };
}

/**
 * Format interval into human-readable string
 */
export function formatInterval(days) {
  if (days < 1 / 24) {
    const mins = Math.max(1, Math.round(days * 1440));
    return `<${mins}m`;
  }
  if (days < 1) {
    const hrs = Math.round(days * 24);
    return `${hrs}h`;
  }
  if (days < 30) {
    const d = Math.round(days);
    return `${d}d`;
  }
  if (days < 365) {
    const mo = (days / 30.4375).toFixed(1).replace(/\.0$/, '');
    return `${mo}mo`;
  }
  const yr = (days / 365.25).toFixed(1).replace(/\.0$/, '');
  return `${yr}y`;
}

/**
 * Preview the intervals for all 4 ratings for a given card
 */
export function previewNextIntervals(card, now = Date.now()) {
  const c = card || createEmptyCard(now);
  const rAgain = repeat(c, Rating.Again, now);
  const rHard = repeat(c, Rating.Hard, now);
  const rGood = repeat(c, Rating.Good, now);
  const rEasy = repeat(c, Rating.Easy, now);

  return {
    again: formatInterval(rAgain.scheduled_days),
    hard: formatInterval(rHard.scheduled_days),
    good: formatInterval(rGood.scheduled_days),
    easy: formatInterval(rEasy.scheduled_days)
  };
}

/**
 * Collect all Study Tape & Answer Cover cards from a board store
 */
export function collectStudyCards(store, now = Date.now()) {
  if (!store || !Array.isArray(store.objects)) return [];
  const cards = [];
  for (const o of store.objects) {
    if (o.type === 'curtain') {
      const card = getCard(o);
      const isDue = card.state === State.New || card.due <= now;
      cards.push({
        object: o,
        card,
        isDue,
        isTape: o.subtype === 'tape'
      });
    }
  }
  return cards;
}
