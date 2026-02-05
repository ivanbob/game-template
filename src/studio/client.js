export function getStudioClient(env) {
    if (!env.STUDIO_CORE_URL) return null;

    return {
        post: async (path, body, headers) => {
            try {
                return await fetch(`${env.STUDIO_CORE_URL}${path}`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                });
            } catch {
                return null;
            }
        },
    };
}
