export default {
    fetch(request: Request) {
        return new Response("Cipher Squad backend alive", {
            headers: { "content-type": "text/plain" },
        });
    },
};
