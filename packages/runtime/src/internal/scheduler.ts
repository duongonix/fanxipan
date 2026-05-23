const queue = new Set<() => void>();
let flushing = false;
const MAX_FLUSH_ITERATIONS = 10_000;
let pending = false;

function runQueue() {
  if (flushing) return;
  flushing = true;
  pending = false;
  try {
    let iterations = 0;
    while (queue.size > 0) {
      const jobs = Array.from(queue);
      queue.clear();
      for (const job of jobs) {
        job();
      }
      iterations += jobs.length;
      if (iterations > MAX_FLUSH_ITERATIONS) {
        throw new Error("fanxipan scheduler exceeded max flush iterations");
      }
    }
  } finally {
    flushing = false;
    if (queue.size > 0) enqueueFlush();
  }
}

function enqueueFlush() {
  if (pending || flushing) return;
  pending = true;
  queueMicrotask(runQueue);
}

export function schedule(job: () => void): void {
  queue.add(job);
  enqueueFlush();
}

export function flushSync(): void {
  runQueue();
}


