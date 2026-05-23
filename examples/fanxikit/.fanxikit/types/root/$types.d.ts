export type RouteId = "/";
export type RouteParams = Record<string, never>;
export interface LayoutData extends Record<string, unknown> {}
export interface PageData extends Record<string, unknown> {}
export interface ActionData extends Record<string, unknown> {}
export interface EndpointData extends Record<string, unknown> {}
export type LayoutLoad = (event: { params: RouteParams; url: URL; parent: () => Promise<LayoutData> }) => Promise<LayoutData> | LayoutData;
export type PageLoad = (event: { params: RouteParams; url: URL; parent: () => Promise<LayoutData & PageData> }) => Promise<PageData> | PageData;
export type Actions = Record<string, (event: { params: RouteParams; url: URL; request: Request }) => Promise<ActionData> | ActionData>;
export type RequestHandler = (event: { params: RouteParams; url: URL; request: Request }) => Promise<Response> | Response;
