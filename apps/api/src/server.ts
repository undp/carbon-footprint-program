import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import registerApp from "./app.js";
import { IS_PROD, LOG_LEVEL } from "@/config/environment.js";

const server = Fastify({
  logger: {
    level: LOG_LEVEL,
    transport: !IS_PROD
      ? {
          // Only for local dev
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
      ],
      remove: true,
    },
    // Make request tracing nicer
    genReqId: () => crypto.randomUUID(),
    serializers: {
      req(request) {
        return {
          id: request.id,
          method: request.method,
          url: request.url,
          params: request.params,
        };
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

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
