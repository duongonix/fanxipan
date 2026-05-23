import { createSubscriptionStore } from "../packages/runtime/dist/internal/subscriptions.js";

const ROUNDS = 200;
const SUBS_PER_ROUND = 2000;
const DEPS = ["todos", "status", "modalOpen"];

for (let round = 0; round < ROUNDS; round += 1) {
  const store = createSubscriptionStore();
  let runs = 0;
  const cleanups = [];

  for (let i = 0; i < SUBS_PER_ROUND; i += 1) {
    cleanups.push(
      store.subscribeExpr(DEPS, () => {
        runs += 1;
      }),
    );
  }

  store.flushMany(DEPS);
  await new Promise((resolve) => queueMicrotask(resolve));

  if (runs !== SUBS_PER_ROUND) {
    throw new Error(
      `[soak] unexpected run count at round ${round}: expected ${SUBS_PER_ROUND}, got ${runs}`,
    );
  }

  for (const cleanup of cleanups) cleanup();
  runs = 0;
  store.flushMany(DEPS);
  await new Promise((resolve) => queueMicrotask(resolve));

  if (runs !== 0) {
    throw new Error(`[soak] cleanup leak detected at round ${round}: ${runs} stale subscribers`);
  }
}

console.log(`[soak] passed ${ROUNDS} rounds x ${SUBS_PER_ROUND} subscriptions`);
