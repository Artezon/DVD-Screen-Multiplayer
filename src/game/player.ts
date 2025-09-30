import { randomUUID } from "crypto";
import { radians } from "../utils.js";
import { Point2D } from "./point2d.js";
import type { Game } from "./game.js";

export class Player {
  public id: string;
  public board: Game;
  public nickname: string;
  public _color: string;
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
    this._color = color;
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
      this._size.x =
        this.board.basePlayerWidth * this.board.globalPlayerScale * this._scale;
      this._size.y =
        this.board.basePlayerHeight *
        this.board.globalPlayerScale *
        this._scale;

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
        console.log(`${this.nickname} hit the corner!`);
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
