import { GameObject } from "./objBase.js";
import { Sprite } from "../game/sprite.js";

class ObjSandEffect extends GameObject {
  static DESPAWN_TIME = 32;
  static CHANGE_IMAGE_TIME = 16;
  constructor(game, x, y) {
    super(game, x, y, 16, 16, new Sprite("assets/images/sand.png", 16, 16));
    this.timer = 0;
  }

  update() {
    if (this.timer === ObjSandEffect.DESPAWN_TIME) {
      this.active = false;
      return;
    }

    if (this.timer > ObjSandEffect.CHANGE_IMAGE_TIME) {
      this.sprite.frameIndex = 1;
    }

    if (this.timer % 2 === 0) {
      this.y -= 1;
      this.sprite.facingRight = !this.sprite.facingRight;
    }

    this.timer++;
  }

  draw(ctx) {
    super.draw(ctx);
  }
}

export { ObjSandEffect };
