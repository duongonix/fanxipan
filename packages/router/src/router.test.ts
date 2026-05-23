import { describe, expect, it } from "vitest";
import { createRouter } from "./create-router.js";
import { toInternalHref } from "./intercept.js";
import { diffLayoutChain } from "./layout.js";
import { matchRoute } from "./matcher.js";
import { normalizePathAndKeepQuery } from "./navigation.js";
import { normalizeRoutes } from "./normalize.js";

function C(name: string) {
  return { name };
}

describe("router normalize", () => {
  it("normalizes flat/tree/mixed routes", () => {
    const Home = C("Home");
    const About = C("About");
    const Work = C("Work");
    const User = C("User");
    const records = normalizeRoutes({
      "/": Home,
      "/about": {
        "/": About,
        "/work": Work,
      },
      "/user/:id": User,
    });
    expect(records.some((r) => r.path === "/")).toBe(true);
    expect(records.some((r) => r.path === "/about")).toBe(true);
    expect(records.some((r) => r.path === "/about/work")).toBe(true);
    expect(records.some((r) => r.path === "/user/:id")).toBe(true);
  });

  it("supports layout breakout with parent layout reset", () => {
    const Layout = C("Layout");
    const About = C("About");
    const Clients = C("Clients");
    const records = normalizeRoutes({
      "/about": {
        layout: Layout,
        "/": About,
        "/(clients)": Clients,
      },
    });
    const about = records.find((r) => r.path === "/about");
    const clients = records.find((r) => r.path === "/about/clients");
    expect(about?.layouts.length).toBe(1);
    expect(clients?.layouts.length).toBe(0);
  });

  it("does not duplicate layout chain on nested route", () => {
    const DashboardLayout = C("DashboardLayout");
    const SettingsLayout = C("SettingsLayout");
    const DashboardHome = C("DashboardHome");
    const SettingsHome = C("SettingsHome");
    const records = normalizeRoutes({
      "/dashboard": {
        "/": DashboardHome,
        "/settings": {
          "/": SettingsHome,
          layout: SettingsLayout,
        },
        layout: DashboardLayout,
      },
    });
    const match = records.find((r) => r.path === "/dashboard/settings");
    expect(match?.layouts.length).toBe(2);
    expect(match?.layouts[0]).toBe(DashboardLayout);
    expect(match?.layouts[1]).toBe(SettingsLayout);
  });
});

describe("router matcher", () => {
  it("matches params and catch-all", () => {
    const User = C("User");
    const NotFound = C("NotFound");
    const records = normalizeRoutes({
      "/user/:id/post/:postId": User,
      "/*": NotFound,
    });
    const m1 = matchRoute(records, "/user/10/post/88");
    expect(m1.record?.component).toBe(User);
    expect(m1.params.id).toBe("10");
    expect(m1.params.postId).toBe("88");
    const m2 = matchRoute(records, "/unknown/path");
    expect(m2.record?.component).toBe(NotFound);
  });
});

describe("layout persistence helper", () => {
  it("reuses common layout prefix", () => {
    const A = C("A");
    const B = C("B");
    const Cc = C("C");
    const d = diffLayoutChain([A, B], [A, B, Cc]);
    expect(d.reuseUntil).toBe(2);
    expect(d.unmountCount).toBe(0);
    expect(d.mount).toEqual([Cc]);
  });
});

describe("router api", () => {
  it("exposes reactive route snapshot and isActive", () => {
    const Home = C("Home");
    const About = C("About");
    const router = createRouter({
      "/": Home,
      "/about": About,
    });
    expect(router.route.component).toBeTruthy();
    expect(router.isActive("/")).toBe(true);
    router.destroy();
  });
});

describe("navigation normalize", () => {
  it("keeps query and hash while normalizing path", () => {
    expect(normalizePathAndKeepQuery("dashboard?a=1#tab")).toBe("/dashboard?a=1#tab");
    expect(normalizePathAndKeepQuery("/dashboard//#x")).toBe("/dashboard#x");
  });
});

describe("intercept helpers", () => {
  it("accepts same-origin absolute url and rejects external/hash/download", () => {
    (globalThis as any).window = {
      location: { origin: "http://localhost:5173" },
    };
    const mk = (href: string, extra?: { target?: string; download?: boolean }) =>
      ({
        getAttribute: (name: string) => (name === "href" ? href : null),
        target: extra?.target ?? "",
        hasAttribute: (name: string) => (name === "download" ? !!extra?.download : false),
      }) as unknown as HTMLAnchorElement;

    expect(toInternalHref(mk("http://localhost:5173/a?x=1#h"))).toBe("/a?x=1#h");
    expect(toInternalHref(mk("https://example.com/a"))).toBeNull();
    expect(toInternalHref(mk("#section"))).toBeNull();
    expect(toInternalHref(mk("/file", { download: true }))).toBeNull();
    expect(toInternalHref(mk("/blank", { target: "_blank" }))).toBeNull();
  });
});
