import { performance } from "node:perf_hooks";
import { createSubscriptionStore } from "../packages/runtime/dist/internal/subscriptions.js";

const ITERATIONS = 10000;
const DEPS = ["count", "todos", "status"];

function benchmarkSubscriptions() {
  const store = createSubscriptionStore();
  let runs = 0;
  const start = performance.now();
  const cleanups = [];
  for (let i = 0; i < ITERATIONS; i += 1) {
    cleanups.push(
      store.subscribeExpr(DEPS, () => {
        runs += 1;
      }),
    );
  }
  const subscribeMs = performance.now() - start;

  const flushStart = performance.now();
  store.flushMany(DEPS);
  return new Promise((resolve) => {
    queueMicrotask(() => {
      const flushMs = performance.now() - flushStart;
      const cleanupStart = performance.now();
      for (const cleanup of cleanups) cleanup();
      const cleanupMs = performance.now() - cleanupStart;
      resolve({ subscribeMs, flushMs, cleanupMs, runs });
    });
  });
}

const result = await benchmarkSubscriptions();
console.log(
  JSON.stringify(
    {
      iterations: ITERATIONS,
      ...result,
    },
    null,
    2,
  ),
);

const subscribeBudgetMs = 200;
const flushBudgetMs = 50;
const cleanupBudgetMs = 120;

if (
  result.subscribeMs > subscribeBudgetMs ||
  result.flushMs > flushBudgetMs ||
  result.cleanupMs > cleanupBudgetMs
) {
  console.error(
    `[benchmark] Budget exceeded: subscribe ${result.subscribeMs.toFixed(2)}ms (<=${subscribeBudgetMs}), flush ${result.flushMs.toFixed(2)}ms (<=${flushBudgetMs}), cleanup ${result.cleanupMs.toFixed(2)}ms (<=${cleanupBudgetMs})`,
  );
  process.exit(1);
}

console.log("[benchmark] Runtime subscription benchmark passed.");
