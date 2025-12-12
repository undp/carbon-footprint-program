import { createApp } from "./app.js";
import { HOST, PORT } from "./config/environment.js";

const app = await createApp();

app.listen({ host: HOST, port: PORT }, (err, _address) => {
  if (err) {
    app.log.error(err);
    throw new Error(err.message);
  }
});
