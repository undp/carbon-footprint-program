import { createApp } from "./app.js";

const app = await createApp();

app.listen({ port: 8080 }, (err, address) => {
  if (err) {
    app.log.error(err);
    throw new Error(err.message);
  }
  app.log.info(`Server listening at ${address}`);
});
