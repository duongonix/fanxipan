/* fanxikit Cloudflare adapter entry. Bundle this file with your worker build. */
export default {
  async fetch(request, env, ctx) {
    return new Response('fanxikit cloudflare adapter entry generated', { status: 200 });
  }
};
