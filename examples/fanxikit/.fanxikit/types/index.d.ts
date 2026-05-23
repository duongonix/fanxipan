export type RouteId = string;
export interface fanxikitLoadEvent<TParams extends Record<string, string> = Record<string, string>> {
  params: TParams;
  url: URL;
  route: { id: RouteId };
}
