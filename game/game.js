import { ObjBase } from "../objects/objBase.js";
import { ObjPlayer } from "../objects/objPlayer.js";
import { input, inputPressed } from "./input.js";
import { Tilemap } from "./tilemap.js";
import { SoundManager } from "./sound.js";

const TILES = {
  solid: {
    char: "#",
    imageIndex: 1,
  },
  sand: {
    char: "S",
    imageIndex: 2,
  },
  air: {
    char: "_",
    imageIndex: 0,
  },
};

const TILE_SIZE = 16;

class Game {
  constructor(canvasId) {
    // Basic canvas setup
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.backgroundColor = "black";

    // Generate empty tilemap
    const tileDataHeight = Math.floor(this.canvas.height / TILE_SIZE);
    const tileDataWidth = Math.floor(this.canvas.width / TILE_SIZE);
    let tileDataString = "";
    for (let i = 0; i < tileDataHeight; i++) {
      tileDataString += TILES.air.char.repeat(tileDataWidth) + "\n";
    }
    this.tilemap = new Tilemap(this, tileDataString);

    this.gameObjects = [];
    this.gameObjects.push(new ObjPlayer(this, 32, 176));

    this.soundManager = new SoundManager();

    this.frame = 0;
    this.paused = false;
    this.frameAdvance = false;
    this.loop = this.#loop.bind(this);

    this.canvas.addEventListener("mousedown", (e) => {
      // console.log("mousemove", e);
      // const rect = this.canvas.getBoundingClientRect();
      // const mouseX = e.clientX - rect.left;
      // const mouseY = e.clientY - rect.top;
      // const tileX = Math.floor(mouseX / TILE_SIZE);
      // const tileY = Math.floor(mouseY / TILE_SIZE);
      // const tile = this.tilemap.getTileAtPixel(tileX, tileY);
      // console.log(`Mouse over tile: (${tileX}, ${tileY}) = '${tile}'`);
    });
  }

  setBackgroundColor(color) {
    this.backgroundColor = color;
  }

  #loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.tilemap.draw(this.ctx);

    if (this.debugElem) {
      this.debugElem.textContent = `Frame: ${this.frame}`;
    }

    if (this.frameAdvance) {
      this.frameAdvance = false;
      this.paused = true;
    }
    if (inputPressed.start) {
      this.paused = !this.paused;
      if (this.paused) this.soundManager.music.pause();
      else this.soundManager.music.play();

      this.frameAdvance = false;
    }
    if (inputPressed.select && this.paused) {
      this.frameAdvance = true;
      this.paused = false;
    }

    if (!this.paused) this.frame = (this.frame + 1) % 60;

    this.gameObjects = this.gameObjects.filter((obj) => obj.active); // Remove inactive objects
    for (const obj of this.gameObjects) {
      if (!this.paused) obj.update();
      obj.draw(this.ctx);
    }

    // reset input_hit
    for (const key in inputPressed) {
      inputPressed[key] = false;
    }

    requestAnimationFrame(this.loop);
  }

  #buildSandPit() {
    this.tilemap.setTileRectangle(2, 4, Math.floor(this.canvas.width / TILE_SIZE) - 4, 7, TILES.sand.char);
  }

  start() {
    this.soundManager.playMusic();

    let canvasWidthInTiles = Math.floor(this.canvas.width / TILE_SIZE);

    this.tilemap.setTileRectangle(0, 0, 1, 15, TILES.solid.char); // left wall
    this.tilemap.setTileRectangle(canvasWidthInTiles - 1, 0, 1, 15, TILES.solid.char); // right wall
    this.tilemap.setTileRectangle(0, 0, canvasWidthInTiles, 1, TILES.solid.char); // ceiling
    this.tilemap.setTileRectangle(0, 13, canvasWidthInTiles, 2, TILES.solid.char); // floor
    this.#buildSandPit();

    document.getElementById("reset-button").addEventListener("click", () => {
      this.#buildSandPit();
      document.getElementById("text-output").innerText = "???";
    });

    this.loop();
  }
}

export { Game };
export { TILES, TILE_SIZE };
