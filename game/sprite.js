class Sprite {
  constructor(imagePath, frameWidth, frameHeight) {
    this.image = new Image();
    this.image.src = imagePath;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameIndex = 0;
    this.facingRight = true;
  }

  draw(ctx, x, y) {
    const sx = this.frameIndex * this.frameWidth;
    const sy = 0; // Assuming all frames are in a single row

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(x + this.frameWidth, y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, sx, sy, this.frameWidth, this.frameHeight, 0, 0, this.frameWidth, this.frameHeight);
    } else {
      ctx.drawImage(this.image, sx, sy, this.frameWidth, this.frameHeight, x, y, this.frameWidth, this.frameHeight);
    }
    ctx.restore();
  }
}

export { Sprite };
