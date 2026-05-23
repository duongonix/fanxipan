import { createRouter } from "./create-router.js";
import { createRouterView } from "./view.js";
import type { RouteConfig, Router } from "./types.js";

type RoutesProps = {
  routes: RouteConfig | Router;
};

export function Routes(host: Element, _ctx: unknown, props: RoutesProps): () => void {
  const ownsRouter = !isRouter(props.routes);
  const router = ownsRouter ? createRouter(props.routes as RouteConfig) : (props.routes as Router);
  const view = createRouterView({
    current: () => router.route,
  });
  const stopMount = view.mount(host);
  const offRoute = router.route.subscribe(() => {
    view.render();
  });
  return () => {
    offRoute();
    stopMount();
    if (ownsRouter) {
      router.destroy();
    }
  };
}

function isRouter(value: unknown): value is Router {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Router).navigate === "function" &&
    typeof (value as Router).route === "object"
  );
}
