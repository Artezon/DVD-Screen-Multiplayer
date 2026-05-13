import type WebSocket from "ws";

// Connected client (either player or spectator)
export type Client = {
  id: string;
  ws: WebSocket;
  playerId?: string; // undefined for spectators
  isSpectator: boolean;
};

export type Point2D = {
  x: number;
  y: number;
};

export type ChatMessage = {
  timestamp: number;
  text: string;
};
