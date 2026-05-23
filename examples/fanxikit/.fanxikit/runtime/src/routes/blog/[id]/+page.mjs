export const ssr = true;
export const csr = true;
export async function load(event) {
    const parent = await event.parent();
    return {
        ...parent,
        universal: true,
    };
}
