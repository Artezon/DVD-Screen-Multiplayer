import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import fastifyWebsocket from "@fastify/websocket";
import ejs from "ejs";
import { projectRoot } from "./utils.js";
import path from "path";
import { Client } from "./client.js";
import config from "./config.js";
import { Game } from "./game/index.js";
import { createDvdRoutes } from "./routes.js";

export function startGameLoop(game: Game, clients: Map<string, Client>): void {
  function gameLoop(): void {
    const now: number = Date.now();
    const dt: number = (now - last) / 1000;
    last = now;
    game.update(dt);

    for (const [clientId, client] of clients.entries()) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        // Clean up disconnected clients
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
  root: path.join(projectRoot, "public"),
  prefix: "/dvd/public/",
});
await fastify.register(fastifyView, {
  engine: { ejs },
  root: path.join(projectRoot, "views"),
});
await fastify.register(fastifyWebsocket);
await fastify.register(createDvdRoutes(game, clients), { prefix: "/dvd" });

startGameLoop(game, clients);

try {
  await fastify.listen({ host: config.host, port: config.port });
  console.log(`Server running at http://${config.host}:${config.port}`);
} catch (error) {
  console.error("Error starting server:", error);
  process.exit(1);
}
