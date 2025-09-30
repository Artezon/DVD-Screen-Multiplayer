import { randomUUID } from "crypto";
import { FastifyRequest } from "fastify";
import WebSocket from "ws";
import { Client } from "./client.js";
import { Game, Player } from "./game/index.js";

function serializePlayer(player: Player) {
  return {
    id: player.id,
    nickname: player.nickname,
    color: player.color,
    pos: player.pos,
    velocity: player.velocity,
    size: player.size,
    cornerHits: player.cornerHits,
  };
}

function getAllPlayersInfo(game: Game): any[] {
  const playersInfo: any[] = [];
  for (const p of game.players.values()) {
    playersInfo.push(serializePlayer(p));
  }
  return playersInfo;
}

function broadcast(
  clients: Map<string, Client>,
  excludeClientId: string | null,
  object: any
) {
  for (const [otherClientId, otherClient] of clients.entries()) {
    if (
      otherClientId !== excludeClientId &&
      otherClient.ws.readyState === WebSocket.OPEN
    ) {
      otherClient.ws.send(JSON.stringify(object));
    }
  }
}

function cleanupClient(
  client: Client,
  clients: Map<string, Client>,
  game: Game
) {
  if (client.playerId) {
    game.removePlayer(client.playerId);
  }
  clients.delete(client.id);
}

function sendGameState(game: Game, ws: WebSocket) {
  ws.send(
    JSON.stringify({
      type: "spectator_init",
      players: getAllPlayersInfo(game),
      board: {
        width: game.width,
        height: game.height,
      },
    })
  );
}

function handlePlayerJoin(receivedData: any, client: Client, clients: Map<string, Client>, game: Game, ws: WebSocket) {
  // If client is already a player (fix players-ghosts)
  if (!client.isSpectator || client.playerId) return;

  const player = game.addPlayer(receivedData.nickname, receivedData.color);
  client.playerId = player.id;
  client.isSpectator = false;

  ws.send(
    JSON.stringify({
      type: "player_init",
      player: serializePlayer(player),
    })
  );

  // Broadcast new player data to all other clients
  const newPlayerData = {
    type: "new_player",
    player: serializePlayer(player)
  };
  broadcast(clients, client.id, newPlayerData)

  console.log(`${receivedData.nickname} joined tha game`);
}

function handlePlayerLeave(client: Client, clients: Map<string, Client>, game: Game, ws: WebSocket) {
  // Convert player back to spectator
  if (client.playerId) {
    console.log(`${game.players.get(client.playerId)?.nickname} left tha game`);

    game.removePlayer(client.playerId);

    // Broadcast player left to all other clients
    const playerLeftData = {
      type: "player_left",
      playerId: client.playerId
    };
    broadcast(clients, client.id, playerLeftData)

    client.playerId = undefined;
    client.isSpectator = true;

    // Send spectator confirmation to the leaving client
    ws.send(
      JSON.stringify({
        type: "spectator_mode",
      })
    );
  }
}

function handleNewColor(receivedData: any, client: Client, game: Game) {
  if (client.playerId) {
    const player = game.players.get(client.playerId);
    if (player) player.color = receivedData.color;
  }
}

function createGameWebSocketHandler(game: Game, clients: Map<string, Client>) {
  return function gameWebSocketHandler(ws: WebSocket, req: FastifyRequest) {
    const clientId = randomUUID();
    const client: Client = { id: clientId, ws: ws, isSpectator: true };
    clients.set(clientId, client);
    sendGameState(game, ws); // send initial game state to the new client
    console.log(`Client ${clientId} connected`);

    ws.on("message", (msg: WebSocket.Data) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === "join" && data.nickname && data.color) {
          handlePlayerJoin(data, client, clients, game, ws);
        }
        if (data.type === "leave") {
          handlePlayerLeave(client, clients, game, ws);
        }
        if (data.type === "new_color") {
          handleNewColor(data, client, game);
        }
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", ts: data.ts }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      cleanupClient(client, clients, game);
      console.log(`Client ${clientId} disconnected (connection closed)`);
    });

    ws.on("error", (error) => {
      cleanupClient(client, clients, game);
      console.log(
        `Client ${clientId} disconnected (WebSocket error: ${error})`
      );
    });
  };
}

export default createGameWebSocketHandler;
