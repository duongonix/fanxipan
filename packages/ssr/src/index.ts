export interface SsrRenderOutput {
  html: string;
  payload: string;
}

export function renderToString(): SsrRenderOutput {
  return { html: "", payload: "{}" };
}
