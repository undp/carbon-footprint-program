import { createApp } from "./app.js";
import { PORT } from "./config/environment.js";

const app = await createApp();

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    app.log.error(err);
    throw new Error(err.message);
  }
  app.log.info(`Server listening at ${address}`);
});
