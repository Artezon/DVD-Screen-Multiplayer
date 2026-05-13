export interface Player {
  id: string;
  nickname: string;
  color: string;
  pos: { x: number; y: number };
  velocity: { x: number; y: number };
  size: { x: number; y: number };
  cornerHits: number;
}

export interface Board {
  width: number;
  height: number;
}

export type ServerMessage =
  | { type: "spectator_init"; players: Player[]; board: Board }
  | { type: "player_init"; player: Player }
  | { type: "spectator_mode" }
  | { type: "new_player"; player: Player }
  | { type: "player_left"; playerId: string }
  | { type: "state"; players: Player[] }
  | { type: "pong"; ts: number }
  | { type: "error"; msg: string };

export type ClientMessage =
  | { type: "join"; nickname: string; color: string }
  | { type: "leave" }
  | { type: "new_color"; color: string }
  | { type: "ping"; ts: number };
