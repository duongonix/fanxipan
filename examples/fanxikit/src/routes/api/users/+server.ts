import { json, text } from "fanxikit";

export function GET(event) {
  return json({
    users: [
      { id: "ada", name: "Ada" },
      { id: "linus", name: "Linus" },
    ],
    current: event.locals.user,
  });
}

export function OPTIONS() {
  return text("", {
    headers: {
      allow: "GET, OPTIONS",
    },
  });
}
