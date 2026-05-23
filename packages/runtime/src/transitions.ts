export interface TransitionConfig {
  delay?: number;
  duration?: number;
  easing?: (t: number) => number;
  css?: (t: number, u: number) => string;
  tick?: (t: number, u: number) => void;
}

export interface TransitionController {
  in?: () => Promise<void> | void;
  out?: () => Promise<void> | void;
  destroy?: () => void;
}

export type TransitionFactory<P = any> = (node: Element, params?: P) => TransitionConfig | TransitionController;

const linear = (t: number) => t;

function run(node: Element, config: TransitionConfig, intro: boolean): Promise<void> {
  const duration = Math.max(0, config.duration ?? 200);
  const delay = Math.max(0, config.delay ?? 0);
  const easing = config.easing ?? linear;
  const start = performance.now() + delay;
  const end = start + duration;
  const previous = (node as HTMLElement).style.cssText;

  node.dispatchEvent(new CustomEvent(intro ? "fanxiintrostart" : "fanxioutrostart"));

  return new Promise((resolve) => {
    const frame = (now: number) => {
      if (now < start) {
        requestAnimationFrame(frame);
        return;
      }
      const raw = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const t = intro ? easing(raw) : 1 - easing(raw);
      const u = 1 - t;
      if (config.css && node instanceof HTMLElement) {
        node.style.cssText = `${previous};${config.css(t, u)}`;
      }
      config.tick?.(t, u);
      if (raw < 1) {
        requestAnimationFrame(frame);
      } else {
        node.dispatchEvent(new CustomEvent(intro ? "fanxiintroend" : "fanxioutroend"));
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

function controller(node: Element, config: TransitionConfig): TransitionController {
  return {
    in: () => run(node, config, true),
    out: () => run(node, config, false),
  };
}

export function fade(node: Element, params: { delay?: number; duration?: number } = {}): TransitionController {
  return controller(node, {
    ...params,
    css: (t) => `opacity:${t}`,
  });
}

export function fly(
  node: Element,
  params: { x?: number; y?: number; delay?: number; duration?: number } = {},
): TransitionController {
  const x = params.x ?? 0;
  const y = params.y ?? 8;
  return controller(node, {
    ...params,
    css: (t, u) => `opacity:${t};transform:translate(${u * x}px, ${u * y}px)`,
  });
}

export function slide(node: Element, params: { delay?: number; duration?: number } = {}): TransitionController {
  const height = node instanceof HTMLElement ? node.offsetHeight : 0;
  return controller(node, {
    ...params,
    css: (t) => `overflow:hidden;height:${Math.max(0, height * t)}px;opacity:${t}`,
  });
}

export function scale(
  node: Element,
  params: { start?: number; delay?: number; duration?: number } = {},
): TransitionController {
  const start = params.start ?? 0.95;
  return controller(node, {
    ...params,
    css: (t) => {
      const value = start + (1 - start) * t;
      return `opacity:${t};transform:scale(${value})`;
    },
  });
}

export function blur(
  node: Element,
  params: { amount?: number; delay?: number; duration?: number } = {},
): TransitionController {
  const amount = params.amount ?? 6;
  return controller(node, {
    ...params,
    css: (t, u) => `opacity:${t};filter:blur(${u * amount}px)`,
  });
}

export function draw(node: Element, params: { delay?: number; duration?: number } = {}): TransitionController {
  const length = typeof (node as any).getTotalLength === "function" ? (node as any).getTotalLength() : 1;
  if (node instanceof SVGElement) {
    node.style.strokeDasharray = String(length);
  }
  return controller(node, {
    ...params,
    css: (t, u) => `stroke-dashoffset:${u * length}`,
  });
}

export function flip(node: Element): TransitionController {
  let first: DOMRect | null = null;
  return {
    in() {
      first = node.getBoundingClientRect();
    },
    out() {
      const last = node.getBoundingClientRect();
      if (!first) return;
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      return run(node, {
        duration: 200,
        css: (t, u) => `transform:translate(${u * dx}px, ${u * dy}px);opacity:${t}`,
      }, true);
    },
  };
}

export function crossfade(): [TransitionFactory, TransitionFactory] {
  return [fade, fade];
}
