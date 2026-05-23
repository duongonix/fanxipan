export type fanxipanComponent = any;

export type RouteTreeNode = {
  layout?: fanxipanComponent;
  [path: string]: unknown;
};

export type RouteConfig = Record<string, fanxipanComponent | RouteTreeNode>;

export type RouteRecord = {
  path: string;
  component: fanxipanComponent;
  layouts: fanxipanComponent[];
  regex: RegExp;
  params: string[];
  score: number;
  catchAll: boolean;
  breakout: boolean;
};

export type RouteSnapshot = {
  path: string;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  component: fanxipanComponent | null;
  layouts: fanxipanComponent[];
  matchedPath: string | null;
};

export type NavigateOptions = {
  replace?: boolean;
};

export type IsActiveOptions = {
  exact?: boolean;
};

export type RouteState = RouteSnapshot & {
  subscribe: (run: (next: RouteSnapshot) => void) => () => void;
};

export type Router = {
  records: RouteRecord[];
  route: RouteState;
  navigate: (to: string | number, options?: NavigateOptions) => void;
  isActive: (path: string, options?: IsActiveOptions) => boolean;
  destroy: () => void;
};


