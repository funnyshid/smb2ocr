import { Sprite } from "../game/sprite.js";

class ObjBase {
  constructor(game, x, y, width, height, sprite = null) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.xStart = x;
    this.yStart = y;
    this.width = width;
    this.height = height;
    this.sprite = sprite;
    this.active = true;
  }

  update() {}

  draw(ctx) {
    if (this.sprite instanceof Sprite) {
      this.sprite.draw(ctx, Math.round(this.x), Math.round(this.y));
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(Math.round(this.x), Math.round(this.y), this.width, this.height);
    }
  }
}

export { ObjBase as GameObject };
