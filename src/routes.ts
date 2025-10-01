import { FastifyPluginAsync } from "fastify";
import createGameWebSocketHandler from "./websocket.js";
import { Game } from "./game/index.js";
import { Client } from "./client.js";

export function createDvdRoutes(
  game: Game,
  clients: Map<string, Client>,
): FastifyPluginAsync {
  const gameWebSocketHandler = createGameWebSocketHandler(game, clients);

  return async (fastify): Promise<void> => {
    fastify.get("/", async (_, reply) => reply.view("index.ejs"));
    fastify.get("/ws/game", { websocket: true }, gameWebSocketHandler);
  };
}
