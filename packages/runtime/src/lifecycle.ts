type Cleanup = () => void;
type LifecycleHook = () => void | Cleanup;

const mountHooks: LifecycleHook[] = [];
const unmountHooks: Cleanup[] = [];

export function mount(run: LifecycleHook): void {
  const cleanup = run();
  if (typeof cleanup === "function") {
    onUnmount(cleanup);
  }
}

export function onMount(run: LifecycleHook): void {
  mountHooks.push(run);
}

export function onUnmount(run: Cleanup): void {
  unmountHooks.push(run);
}

export function runMountHooks(): void {
  const hooks = mountHooks.splice(0);
  for (const hook of hooks) {
    const cleanup = hook();
    if (typeof cleanup === "function") {
      unmountHooks.push(cleanup);
    }
  }
}

export function runUnmountHooks(): void {
  const hooks = unmountHooks.splice(0);
  for (const hook of hooks) hook();
}

export function nextTick(): Promise<void> {
  return Promise.resolve();
}

export const $mount = onMount;
export const $unmount = onUnmount;
export const $nextTick = nextTick;
