import Fastify, { FastifyInstance } from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import ejs from "ejs";
import fastifyWebsocket from "@fastify/websocket";
import { FastifyRequest } from "fastify";
import WebSocket from "ws";
import config from "./config.js";
import { radians } from "./utils.js";

declare global {
  var projectRoot: string;
}

global.projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

class Point2D {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }
}

class Player {
  public id: string;
  public board: Game;
  public nickname: string;
  public color: string;
  public pos: Point2D;
  private _angle: number;
  private _scale: number;
  private _size: Point2D;
  private _speed: number;
  public cornerHits: number;
  public velocity: Point2D;
  public sendData: { [key: string]: any };

  constructor(
    board: Game,
    nickname: string,
    color: string,
    x: number,
    y: number,
    angle: number = -45,
    scale: number,
    speed: number
  ) {
    this.id = randomUUID();
    this.board = board;
    this.nickname = nickname;
    this.color = color;
    this.sendData = {};
    this.pos = new Point2D(x, y);
    this.velocity = new Point2D();
    this._angle = angle;
    this._size = new Point2D();
    this._scale = 0;
    this.scale = scale;
    this._speed = speed;
    this.speed = speed;
    this.angle = angle;
    this.cornerHits = 0;
  }

  private setVelocity(): void {
    this.velocity.x = this._speed * Math.cos(radians(this._angle));
    this.velocity.y = this._speed * Math.sin(radians(this._angle));
  }

  public get speed() {
    return this._speed;
  }
  public set speed(speed: number) {
    if (speed >= 0 && speed <= 1000) {
      this._speed = speed;
      this.setVelocity();
    }
  }

  public get angle() {
    return this._angle;
  }
  public set angle(degrees: number) {
    this._angle = degrees % 360;
    this.setVelocity();
  }

  public get scale() {
    return this._scale;
  }
  public set scale(multiplier: number) {
    if (multiplier > 0 && multiplier <= 100) {
      this._scale = multiplier;
      this._size.x = this.board.basePlayerWidth;
      this._size.y = this.board.basePlayerHeight;
      this.sendData.size = this.size;
    }
  }

  public get size() {
    return this._size;
  }

  public move(dt: number): void {
    this.pos.x += this.velocity.x * dt;
    this.pos.y += this.velocity.y * dt;

    const halfW: number = this.size.x / 2;
    const halfH: number = this.size.y / 2;
    this.edge_collision(halfW, halfH);

    this.sendData.pos = this.pos;
  }

  private edge_collision(halfW: number, halfH: number): void {
    if (this.pos.x < halfW || this.pos.x > this.board.width - halfW) {
      this.velocity.x *= -1;
      if (this.pos.x < halfW) {
        this.pos.x = halfW;
      }
      if (this.pos.x > this.board.width - halfW) {
        this.pos.x = this.board.width - halfW;
      }

      if (
        this.pos.y <= this.board.cornerTolerance ||
        this.pos.y >= this.board.height - halfH - this.board.cornerTolerance
      ) {
        console.log("Corner!");
        this.cornerHits++;
        this.sendData.cornerHits = this.cornerHits;
      }
    }

    if (this.pos.y < halfH || this.pos.y > this.board.height - halfH) {
      this.velocity.y *= -1;
      if (this.pos.y < halfH) {
        this.pos.y = halfH;
      }
      if (this.pos.y > this.board.height - halfH) {
        this.pos.y = this.board.height - halfH;
      }
    }
  }
}

// Interface to represent connected clients (both players and spectators)
interface Client {
  id: string;
  ws: WebSocket;
  playerId?: string | undefined; // Only set if they've joined as a player
  isSpectator: boolean;
}

class Game {
  public tickRate: number;
  public width: number;
  public height: number;
  public basePlayerWidth: number;
  public basePlayerHeight: number;
  public defaultSpeed: number;
  public cornerTolerance: number;
  public players: Map<string, Player>;
  public messageToClients: { [key: string]: any };

  constructor(
    tickRate: number,
    width: number,
    height: number,
    basePlayerWidth: number,
    basePlayerHeight: number,
    defaultSpeed: number
  ) {
    this.tickRate = tickRate;
    this.width = width;
    this.height = height;
    this.basePlayerWidth = basePlayerWidth;
    this.basePlayerHeight = basePlayerHeight;
    this.defaultSpeed = defaultSpeed;
    this.cornerTolerance = 3;

    this.players = new Map<string, Player>();
    this.messageToClients = {};
  }

  public addPlayer(nickname: string, color: string): Player {
    const scale: number = 0.8 + Math.random() * 0.4;
    const w: number = this.basePlayerWidth * scale;
    const h: number = this.basePlayerHeight * scale;
    const x: number =
      this.width * 0.05 + w / 2 + Math.random() * (this.width * 0.9 - w / 2);
    const y: number =
      this.height * 0.05 + h / 2 + Math.random() * (this.height * 0.9 - h / 2);
    const angle: number = Math.floor(Math.random() * 4) * 90 + 45;
    const speed: number = this.defaultSpeed * (0.8 + Math.random() * 0.4);

    const player = new Player(this, nickname, color, x, y, angle, scale, speed);
    this.players.set(player.id, player);
    return player;
  }

  public removePlayer(id: string): void {
    this.players.delete(id);
  }

  public update(dt: number): void {
    this.messageToClients = {};
    this.messageToClients.type = "state";
    this.messageToClients.players = [];

    for (const player of this.players.values()) {
      player.sendData = {};

      player.move(dt);
    }

    for (const player of this.players.values()) {
      for (const otherPlayer of this.players.values()) {
        if (player !== otherPlayer) {
          this.collide(player, otherPlayer);
        }
      }
    }

    for (const player of this.players.values()) {
      player.sendData.pos = player.pos;
      player.sendData.velocity = player.velocity;
      player.sendData.id = player.id;
      this.messageToClients.players.push(player.sendData);
    }
  }

  private collide(a: Player, b: Player): void {
    // Half sizes
    const halfAx: number = a.size.x / 2;
    const halfAy: number = a.size.y / 2;
    const halfBx: number = b.size.x / 2;
    const halfBy: number = b.size.y / 2;

    // Delta between centers
    const dx: number = b.pos.x - a.pos.x;
    const dy: number = b.pos.y - a.pos.y;

    // Overlap along each axis
    const overlapX: number = halfAx + halfBx - Math.abs(dx);
    const overlapY: number = halfAy + halfBy - Math.abs(dy);

    // If overlap on both axes → collision
    if (overlapX > 0 && overlapY > 0) {
      // Resolve the smaller overlap (push them apart)
      if (overlapX < overlapY) {
        const push: number = overlapX / 2;
        if (dx > 0) {
          a.pos.x -= push;
          b.pos.x += push;
        } else {
          a.pos.x += push;
          b.pos.x -= push;
        }
        // Bounce on X axis
        [a.velocity.x, b.velocity.x] = [b.velocity.x, a.velocity.x];
      } else {
        const push: number = overlapY / 2;
        if (dy > 0) {
          a.pos.y -= push;
          b.pos.y += push;
        } else {
          a.pos.y += push;
          b.pos.y -= push;
        }
        // Bounce on Y axis
        [a.velocity.y, b.velocity.y] = [b.velocity.y, a.velocity.y];
      }
    }
  }
}

const fastify = Fastify({
  logger: true,
});

await fastify.register(fastifyStatic, {
  root: path.join(global.projectRoot, "public"),
  prefix: "/public/",
});
await fastify.register(fastifyView, {
  engine: { ejs },
  root: path.join(global.projectRoot, "views"),
});
await fastify.register(fastifyWebsocket);

fastify.get("/", async (req: FastifyRequest, reply) => {
  return reply.view("index.ejs");
});

fastify.get(
  "/ws/game",
  { websocket: true },
  (connection, req: FastifyRequest) => {
    const ws: WebSocket = connection;
    const clientId = randomUUID();

    // Create client as spectator initially
    const client: Client = {
      id: clientId,
      ws: ws,
      isSpectator: true,
    };

    clients.set(clientId, client);

    // Send initial game state to new spectator
    const playersInfo: any[] = [];
    for (const p of game.players.values()) {
      playersInfo.push({
        id: p.id,
        nickname: p.nickname,
        color: p.color,
        pos: p.pos,
        velocity: p.velocity,
        size: p.size,
        cornerHits: p.cornerHits,
      });
    }

    ws.send(
      JSON.stringify({
        type: "spectator_init",
        players: playersInfo,
        board: {
          width: game.width,
          height: game.height,
        },
      })
    );

    ws.on("message", (msg: WebSocket.Data) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === "join" && data.nickname && data.color) {
          // Convert spectator to player
          const player = game.addPlayer(data.nickname, data.color);
          client.playerId = player.id;
          client.isSpectator = false;

          // Send player-specific initialization to the joining client
          const currentPlayersInfo: any[] = [];
          for (const p of game.players.values()) {
            currentPlayersInfo.push({
              id: p.id,
              nickname: p.nickname,
              color: p.color,
              pos: p.pos,
              velocity: p.velocity,
              size: p.size,
              cornerHits: p.cornerHits,
            });
          }

          ws.send(
            JSON.stringify({
              type: "player_init",
              playerId: player.id,
              players: currentPlayersInfo,
              board: {
                width: game.width,
                height: game.height,
              },
            })
          );

          // Broadcast new player data to all other clients
          const newPlayerData = {
            type: "new_player",
            player: {
              id: player.id,
              nickname: player.nickname,
              color: player.color,
              pos: player.pos,
              velocity: player.velocity,
              size: player.size,
              cornerHits: player.cornerHits,
            },
          };

          for (const [otherClientId, otherClient] of clients.entries()) {
            if (
              otherClientId !== clientId &&
              otherClient.ws.readyState === WebSocket.OPEN
            ) {
              otherClient.ws.send(JSON.stringify(newPlayerData));
            }
          }
        }

        if (data.type === "leave") {
          // Convert player back to spectator
          if (client.playerId) {
            game.removePlayer(client.playerId);

            // Broadcast player left to all other clients
            const playerLeftData = {
              type: "player_left",
              playerId: client.playerId,
            };

            for (const [otherClientId, otherClient] of clients.entries()) {
              if (
                otherClientId !== clientId &&
                otherClient.ws.readyState === WebSocket.OPEN
              ) {
                otherClient.ws.send(JSON.stringify(playerLeftData));
              }
            }

            client.playerId = undefined;
            client.isSpectator = true;

            // Send spectator confirmation to the leaving client
            const currentPlayersInfo: any[] = [];
            for (const p of game.players.values()) {
              currentPlayersInfo.push({
                id: p.id,
                nickname: p.nickname,
                color: p.color,
                pos: p.pos,
                velocity: p.velocity,
                size: p.size,
                cornerHits: p.cornerHits,
              });
            }

            ws.send(
              JSON.stringify({
                type: "spectator_mode",
                players: currentPlayersInfo,
                board: {
                  width: game.width,
                  height: game.height,
                },
              })
            );
          }
        }

        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      if (client.playerId) {
        game.removePlayer(client.playerId);
      }
      clients.delete(clientId);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      if (client.playerId) {
        game.removePlayer(client.playerId);
      }
      clients.delete(clientId);
    });
  }
);

const game = new Game(
  config.tickRate,
  config.boardWidth,
  config.boardHeight,
  config.playerWidth,
  config.playerHeight,
  config.playerSpeed
);

// Store all connected clients (both players and spectators)
const clients = new Map<string, Client>();

function startGameLoop(game: Game): void {
  let last: number = Date.now();
  setInterval(() => {
    const now: number = Date.now();
    const dt: number = (now - last) / 1000;
    last = now;
    game.update(dt);

    // Send updates to all connected clients (players and spectators)
    for (const [clientId, client] of clients.entries()) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        // Clean up disconnected clients
        clients.delete(clientId);
        if (client.playerId) {
          game.removePlayer(client.playerId);
        }
        continue;
      }

      // Send game state to all clients (both players and spectators)
      client.ws.send(JSON.stringify(game.messageToClients));
    }
  }, 1000 / game.tickRate);
}

startGameLoop(game);

try {
  await fastify.listen({
    host: config.host,
    port: config.port,
  });
  console.log(`Server running at http://${config.host}:${config.port}`);
} catch (error) {
  console.error("Error starting server:", error);
  process.exit(1);
}
