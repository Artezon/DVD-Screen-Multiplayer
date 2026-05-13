import { randomUUID } from "crypto";
import { radians } from "./utils.js";
import type { Point2D } from "./types.js";
import type { Game } from "./game.js";

export class Player {
  public id: string;
  public board: Game;
  public nickname: string;
  public pos: Point2D;
  public velocity: Point2D;
  public cornerHits: number;
  public sendData: { [key: string]: any };
  private _angle: number;
  private _scale: number;
  private _size: Point2D;
  private _speed: number;
  private _color: string;

  constructor(
    board: Game,
    nickname: string,
    color: string,
    x: number,
    y: number,
    angle: number = -45,
    scale: number,
    speed: number,
  ) {
    this.id = randomUUID();
    this.board = board;
    this.nickname = nickname;
    this.pos = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.cornerHits = 0;
    this.sendData = {};
    this._angle = angle;
    this._scale = 0;
    this._size = { x: 0, y: 0 };
    this.scale = scale;
    this._speed = speed;
    this.speed = speed;
    this.angle = angle;
    this._color = color;
  }

  private updateVelocity(): void {
    this.velocity.x = this._speed * Math.cos(radians(this._angle));
    this.velocity.y = this._speed * Math.sin(radians(this._angle));
  }

  public get color() {
    return this._color;
  }
  public set color(color: string) {
    this._color = color;
    this.sendData.color = this._color;
  }

  public get speed() {
    return this._speed;
  }
  public set speed(speed: number) {
    if (speed >= 0 && speed <= 1000) {
      this._speed = speed;
      this.updateVelocity();
    }
  }

  public get angle() {
    return this._angle;
  }
  public set angle(degrees: number) {
    this._angle = degrees % 360;
    this.updateVelocity();
  }

  public get scale() {
    return this._scale;
  }
  public set scale(multiplier: number) {
    if (multiplier > 0 && multiplier <= 100) {
      this._scale = multiplier;
      this._size.x = this.board.basePlayerWidth * this.board.globalPlayerScale * this._scale;
      this._size.y = this.board.basePlayerHeight * this.board.globalPlayerScale * this._scale;

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

  public edge_collision(halfW: number, halfH: number): void {
    const hitX = this.pos.x <= halfW || this.pos.x >= this.board.width - halfW;
    const hitY = this.pos.y <= halfH || this.pos.y >= this.board.height - halfH;

    if (hitX) {
      this.velocity.x *= -1;
      this.pos.x = Math.max(halfW, Math.min(this.pos.x, this.board.width - halfW));
    }

    if (hitY) {
      this.velocity.y *= -1;
      this.pos.y = Math.max(halfH, Math.min(this.pos.y, this.board.height - halfH));
    }

    if (hitX && hitY) {
      this.cornerHits++;
      this.sendData.cornerHits = this.cornerHits;

      const left = this.pos.x < this.board.width / 2;
      const top = this.pos.y < this.board.height / 2;
      const cornerName = `${top ? "top" : "bottom"} ${left ? "left" : "right"}`;
      this.board.addMessage(`${this.nickname} hit the ${cornerName} corner!`);
    }
  }
}
