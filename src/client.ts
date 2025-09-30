import WebSocket from "ws";

// Interface to represent connected clients (both players and spectators)
export interface Client {
  id: string;
  ws: WebSocket;
  playerId?: string | undefined; // undefined for spectators
  isSpectator: boolean;
}
