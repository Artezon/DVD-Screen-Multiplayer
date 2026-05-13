import { resolve } from "path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import type { Client } from "./types.js";
import config from "./config.js";
import { Game } from "./game.js";
import createGameWebSocketHandler from "./websocket.js";

export function startGameLoop(game: Game, clients: Map<string, Client>): void {
  function gameLoop(): void {
    const now: number = Date.now();
    const dt: number = (now - last) / 1000;
    last = now;
    game.update(dt);

    for (const [clientId, client] of clients.entries()) {
      // Clean up disconnected clients
      if (client.ws.readyState !== WebSocket.OPEN) {
        clients.delete(clientId);
        if (client.playerId) {
          game.removePlayer(client.playerId);
        }
        continue;
      }

      if (game.players.size > 0 || lastPlayerCount > 0) {
        // Send updates to all connected clients (players and spectators)
        client.ws.send(JSON.stringify(game.messageToClients));
        lastPlayerCount = game.players.size;
      }
    }
  }

  let last: number = Date.now();
  let lastPlayerCount: number = 0;
  setInterval(gameLoop, 1000 / game.tickRate);
}

const game = new Game(
  config.tickRate,
  config.boardWidth,
  config.boardHeight,
  config.playerWidth,
  config.playerHeight,
  config.globalPlayerScale,
  config.playerSpeed,
  config.cornerTolerance,
);

const clients = new Map<string, Client>(); // all connected clients (both players and spectators)

const fastify = Fastify({ logger: true });
await fastify.register(fastifyStatic, {
  root: resolve(process.cwd(), "dist", "frontend"),
  serve: false,
});
await fastify.register(fastifyStatic, {
  root: resolve(process.cwd(), "dist", "frontend", "static"),
  prefix: "/dvd/static",
  decorateReply: false,
});
await fastify.register(fastifyStatic, {
  root: resolve(process.cwd(), "dist", "frontend", "assets"),
  prefix: "/dvd/assets/",
  decorateReply: false,
});
await fastify.register(fastifyWebsocket);

fastify.get("/dvd", async (_, reply) => reply.sendFile("index.html"));
fastify.get("/dvd/ws/game", { websocket: true }, createGameWebSocketHandler(game, clients));

startGameLoop(game, clients);

try {
  await fastify.listen({ host: config.host, port: config.port });
} catch (error) {
  console.error("Error starting server:", error);
  process.exit(1);
}
