import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import registerApp from "./app.js";

const server = fastify().withTypeProvider<ZodTypeProvider>();

// Configurar los compiladores de validación y serialización para Zod
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Registrar la aplicación completa
await server.register(registerApp);

server.listen({ port: 8080 }, (err, _address) => {
  if (err) {
    //console.error(err);
    throw new Error(err.message);
  }
  //console.log(`Server listening at ${address}`);
});
