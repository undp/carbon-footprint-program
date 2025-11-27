import fastify from "fastify";

const server = fastify();

server.get("/ping", async (_request, _reply) => {
  return "pong\n";
});

server.listen({ port: 8080 }, (err, _address) => {
  if (err) {
    //console.error(err);
    throw new Error(err.message);
  }
  //console.log(`Server listening at ${address}`);
});
