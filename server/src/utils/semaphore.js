const { MAX_CONCURRENT_EXPORTS } = require('../utils/constants');

const EXPORT_QUEUE_TIMEOUT_MS = 120000;

class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire(timeoutMs = EXPORT_QUEUE_TIMEOUT_MS) {
    if (this.current < this.max) {
      this.current++;
      return;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.indexOf(resolve);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
        }
        reject(new Error('Export queue timeout — too many concurrent exports'));
      }, timeoutMs);

      this.queue.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  release() {
    if (this.queue.length > 0) {
      // Hand off the slot to the next waiter — current stays the same
      const next = this.queue.shift();
      next();
    } else {
      this.current = Math.max(0, this.current - 1);
    }
  }

  get stats() {
    return {
      active: this.current,
      waiting: this.queue.length,
      max: this.max,
    };
  }
}

const exportSemaphore = new Semaphore(MAX_CONCURRENT_EXPORTS);

async function withExportLimit(fn) {
  await exportSemaphore.acquire();
  try {
    return await fn();
  } finally {
    exportSemaphore.release();
  }
}

module.exports = {
  exportSemaphore,
  withExportLimit,
};
