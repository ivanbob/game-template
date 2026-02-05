import { handleStudio } from "./studio/client";

export default {
    fetch(request, env, ctx) {
        return handleStudio(request, env, ctx);
    },
};
