import { TILES, TILE_SIZE } from "./game.js";
import { getTextFromImage, textToImage } from "./ocr.js";

class Tilemap {
  constructor(game, tileDataString) {
    this.game = game;
    this.tileData = tileDataString
      .trim()
      .split("\n")
      .map((n) => n.split(""));

    this.tilesetImage = new Image();
    this.tilesetImage.src = "./assets/images/tileset.png";
  }

  draw(ctx) {
    for (let y = 0; y < this.tileData.length; y++) {
      for (let x = 0; x < this.tileData[y].length; x++) {
        const char = this.tileData[y][x];
        let tileType = Object.values(TILES).find((t) => t.char === char);
        if (!tileType) tileType = TILES.air;
        if (tileType.imageIndex === 0) continue; // This is an air tile, skip drawing it

        ctx.drawImage(
          this.tilesetImage,
          tileType.imageIndex * TILE_SIZE, // Source X
          0, // Source Y
          TILE_SIZE, // Source Width
          TILE_SIZE, // Source Height
          x * TILE_SIZE, // Destination X
          y * TILE_SIZE, // Destination Y
          TILE_SIZE, // Destination Width
          TILE_SIZE // Destination Height
        );
      }
    }
  }

  getTileAtPixel(x, y) {
    try {
      let tileX = Math.floor(x / TILE_SIZE);
      let tileY = Math.floor(y / TILE_SIZE);

      return this.tileData[tileY][tileX];
    } catch (e) {
      // Out of bounds, return air
      return TILES.air.char;
    }
  }

  setTileAtPixel(x, y, tile) {
    let tileX = Math.floor(x / TILE_SIZE);
    let tileY = Math.floor(y / TILE_SIZE);

    this.tileData[tileY][tileX] = tile;
  }

  getTileRectangle(tileX, tileY, rectWidth, rectHeight) {
    let tiles = "";
    for (let ty = tileY; ty < tileY + rectHeight; ty++) {
      for (let tx = tileX; tx < tileX + rectWidth; tx++) {
        tiles += this.tileData[ty][tx];
      }
      tiles += "\n";
    }
    return tiles;
  }

  setTileRectangle(tileX, tileY, rectWidth, rectHeight, tile) {
    for (let ty = tileY; ty < tileY + rectHeight; ty++) {
      for (let tx = tileX; tx < tileX + rectWidth; tx++) {
        this.tileData[ty][tx] = tile;
      }
    }
  }

  findTextInSand() {
    const sandData = this.getTileRectangle(2, 4, Math.floor(this.game.canvas.width / TILE_SIZE) - 4, 7);
    const canvasWithText = textToImage(sandData);
    getTextFromImage(canvasWithText).then((extractedText) => {
      document.getElementById("text-output").innerText = extractedText;
    });
  }

  meetingSolidTileAt(x, y, includeSemisolid = false) {
    return this.getTileAtPixel(x, y) == TILES.solid.char || (includeSemisolid && this.getTileAtPixel(x, y) == TILES.sand.char);
  }
}

export { Tilemap };
