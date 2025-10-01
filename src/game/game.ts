import { Player } from "./player.js";

export class Game {
  public players: Map<string, Player>;
  public messageToClients: { [key: string]: any };

  constructor(
    public tickRate: number,
    public width: number,
    public height: number,
    public basePlayerWidth: number,
    public basePlayerHeight: number,
    public globalPlayerScale: number,
    public defaultSpeed: number,
    public cornerTolerance: number,
  ) {
    this.players = new Map<string, Player>();
    this.messageToClients = {};
  }

  public addPlayer(nickname: string, color: string): Player {
    this.setGlobalPlayerScale(1 / (1 + 0.1 * this.players.size));

    const w: number = this.basePlayerWidth * this.globalPlayerScale;
    const h: number = this.basePlayerHeight * this.globalPlayerScale;
    const x: number =
      this.width * 0.05 + w / 2 + Math.random() * (this.width * 0.9 - w / 2);
    const y: number =
      this.height * 0.05 + h / 2 + Math.random() * (this.height * 0.9 - h / 2);
    const angle: number = Math.floor(Math.random() * 4) * 90 + 45;
    const speed: number = this.defaultSpeed * (0.8 + Math.random() * 0.4);

    const player = new Player(this, nickname, color, x, y, angle, 1, speed);
    this.players.set(player.id, player);
    return player;
  }

  public removePlayer(id: string): void {
    this.players.delete(id);

    this.setGlobalPlayerScale(1 / (1 + 0.1 * this.players.size));
  }

  public setGlobalPlayerScale(scale: number): void {
    this.globalPlayerScale = scale;
    for (const player of this.players.values()) {
      player.scale = player.scale;
    }
  }

  public update(dt: number): void {
    this.messageToClients = {};
    this.messageToClients.type = "state";
    this.messageToClients.players = [];

    for (const player of this.players.values()) {
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
      player.sendData = {};
    }
  }

  private collide(a: Player, b: Player): void {
    function collideOnAxis(overlap: number, delta: number, axis: "x" | "y") {
      const push: number = overlap / 2;
      if (delta > 0) {
        a.pos[axis] -= push;
        b.pos[axis] += push;
      } else {
        a.pos[axis] += push;
        b.pos[axis] -= push;
      }
      // Bounce (if moving towards each other)
      const relativeVel = b.velocity[axis] - a.velocity[axis];
      if ((delta > 0 && relativeVel < 0) || (delta < 0 && relativeVel > 0)) {
        a.velocity[axis] *= -1;
        b.velocity[axis] *= -1;
      }
    }

    // Half sizes
    const halfAx: number = a.size.x / 2;
    const halfAy: number = a.size.y / 2;
    const halfBx: number = b.size.x / 2;
    const halfBy: number = b.size.y / 2;

    // Delta between centers
    let dx: number = b.pos.x - a.pos.x;
    let dy: number = b.pos.y - a.pos.y;

    // Overlap along each axis
    let overlapX: number = halfAx + halfBx - Math.abs(dx);
    let overlapY: number = halfAy + halfBy - Math.abs(dy);

    // If overlap on both axes -> collision
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        collideOnAxis(overlapX, dx, "x");
      } else {
        collideOnAxis(overlapY, dy, "y");
      }
    }
  }
}
