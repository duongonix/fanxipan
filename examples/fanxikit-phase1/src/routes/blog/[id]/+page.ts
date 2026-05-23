export const ssr = true;
export const csr = true;

export async function load({ params }) {
  return {
    from: "client-load",
    id: params.id,
  };
}
