// How many calls to the AI provider are in flight at once, for the whole
// server. Past that they wait their turn (first come, first served); if the
// line is too long, or the wait too long, the person is told to retry in a
// moment instead of the provider answering everyone with "too many requests".
//
// Each step of a conversation is one turn here (a question that uses the
// tools makes several), so a long exchange cannot hold the others out.

export function createAiLimiter({ max = 6, maxQueue = 80, waitMs = 40000, now = () => Date.now() } = {}) {
  let running = 0;
  const queue = [];
  const stats = { served: 0, queuedNow: 0, rejectedFull: 0, rejectedTimeout: 0, peakRunning: 0, peakQueue: 0 };

  function busy(code, message) {
    const err = new Error(message);
    err.aiQueue = code;
    err.status = 429;
    err.statusCode = 429;
    return err;
  }

  function release() {
    running -= 1;
    while (queue.length && running < max) {
      const next = queue.shift();
      stats.queuedNow = queue.length;
      clearTimeout(next.timer);
      running += 1;
      stats.peakRunning = Math.max(stats.peakRunning, running);
      next.go();
    }
  }

  async function run(fn) {
    if (running >= max) {
      if (queue.length >= maxQueue) {
        stats.rejectedFull += 1;
        throw busy("full", "Coach AI molto richiesto: riprova tra qualche secondo.");
      }
      await new Promise((resolve, reject) => {
        const entry = { go: resolve, timer: null };
        entry.timer = setTimeout(() => {
          const i = queue.indexOf(entry);
          if (i >= 0) queue.splice(i, 1);
          stats.queuedNow = queue.length;
          stats.rejectedTimeout += 1;
          reject(busy("timeout", "Coach AI molto richiesto: riprova tra qualche secondo."));
        }, waitMs);
        queue.push(entry);
        stats.queuedNow = queue.length;
        stats.peakQueue = Math.max(stats.peakQueue, queue.length);
      });
    } else {
      running += 1;
      stats.peakRunning = Math.max(stats.peakRunning, running);
    }
    try {
      return await fn();
    } finally {
      stats.served += 1;
      release();
    }
  }

  return { run, stats: () => ({ ...stats, running, queued: queue.length, max, maxQueue }) };
}
