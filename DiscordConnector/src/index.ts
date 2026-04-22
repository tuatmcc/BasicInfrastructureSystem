import { createApp } from "./PublicAPI/app";

const app = createApp();

export default {
  fetch(request: Request, env: Env, executionContext: ExecutionContext): Response | Promise<Response> {
    return app.fetch(request, env, executionContext);
  },
};
