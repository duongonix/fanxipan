import { fail, redirect } from "fanxikit";

export const actions = {
  default: async (event) => {
    console.log("Processing logissn form...");
    const form = await event.request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail(422, { name: "required" });
    event.cookies.set("session", name.toLowerCase(), { maxAge: 60 * 60 });
    redirect(303, "/dashboard");
  },
};
