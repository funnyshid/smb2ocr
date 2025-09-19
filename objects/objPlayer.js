import { input, inputPressed } from "../game/input.js";
import { ObjBase } from "./objBase.js";
import { ObjSandEffect } from "./objSandEffect.js";
import { TILES } from "../game/game.js";
import { Sprite } from "../game/sprite.js";

class ObjPlayer extends ObjBase {
  // Physics constants in full-pixels per frame
  // These values were observed from the original game RAM
  static WALK_SPEED = 1.5;
  static RUN_SPEED = 2.25;
  static ACCELERATION = 0.125;
  static DECELERATION = 0.125;
  static DECELERATION_NO_INPUT = 0.1875;
  static X_SPEED_LIMIT = 4;
  static GRAVITY_JUMP_HELD = 0.25;
  static GRAVITY_NO_JUMP_HELD = 0.4375;
  static JUMP_FORCE_WEAK = -5;
  static JUMP_FORCE_STRONG = -5.625;
  static JUMP_FORCE_CROUCH = -6.5;
  static X_SPEED_NEEDED_FOR_HIGH_JUMP = 0.5;
  static TERMINAL_VELOCITY = 3.75; // In the actual game, this varies but is usually ~60 subpixels

  // Timer constants
  static JUMP_BUFFER_WINDOW = 6; // There is no jump buffer in original game, but this is just a QoL addition
  static CROUCH_JUMP_BUILDUP_TIME = 60;
  static DIG_DURATION = 14;

  // Collision probe offsets for different player sizes and states
  // The sprite is always 16x32 with an origin of 0,0, but the collision box changes
  // This allows for mechanics such as pushing out of walls and not bonking on corner ceilings
  static TILE_COLLISION_OFFSETS = {
    big: {
      downLeft: {
        vert: [
          { x: 4, y: 32 }, // Foot left
          { x: 11, y: 32 }, // Foot right
        ],
        horiz: [
          { x: 13, y: 27 }, // Side bottom
          { x: 13, y: 14 }, // Side top
        ],
      },
      downRight: {
        vert: [
          { x: 4, y: 32 }, // Foot left
          { x: 11, y: 32 }, // Foot right
        ],
        horiz: [
          { x: 2, y: 27 }, // Side bottom
          { x: 2, y: 14 }, // Side top
        ],
      },
      upLeft: {
        vert: [
          { x: 8, y: 6 }, // Head
          { x: 8, y: 6 }, // Head
        ],
        horiz: [
          { x: 13, y: 27 }, // Side bottom
          { x: 13, y: 14 }, // Side top
        ],
      },
      upRight: {
        vert: [
          { x: 8, y: 6 }, // Head
          { x: 8, y: 6 }, // Head
        ],
        horiz: [
          { x: 2, y: 27 }, // Side bottom
          { x: 2, y: 14 }, // Side top
        ],
      },
    },
    small: {
      downLeft: {
        vert: [
          { x: 4, y: 32 }, // Foot left
          { x: 11, y: 32 }, // Foot right
        ],
        horiz: [
          { x: 13, y: 27 }, // Side bottom
          { x: 13, y: 22 }, // Side top
        ],
      },
      downRight: {
        vert: [
          { x: 4, y: 32 }, // Foot left
          { x: 11, y: 32 }, // Foot right
        ],
        horiz: [
          { x: 2, y: 27 }, // Side bottom
          { x: 2, y: 22 }, // Side top
        ],
      },
      upLeft: {
        vert: [
          { x: 8, y: 16 }, // Head
          { x: 8, y: 16 }, // Head
        ],
        horiz: [
          { x: 13, y: 27 }, // Side bottom
          { x: 13, y: 22 }, // Side top
        ],
      },
      upRight: {
        vert: [
          { x: 8, y: 16 }, // Head
          { x: 8, y: 16 }, // Head
        ],
        horiz: [
          { x: 2, y: 27 }, // Side bottom
          { x: 2, y: 22 }, // Side top
        ],
      },
    },
  };
  static HEAD_CHECK_OFFSETS = {
    big: 10,
    small: 20,
  };

  // Animation
  static ANIMATION_STATE = {
    STANDING: 0,
    WALKING: 1,
    RUNNING: 2,
    JUMPING: 3,
    FALLING: 4,
    DUCKING: 5,
    DIGGING: 6,
  };
  static WALK_FRAME_TIME = 5;
  static RUN_FRAME_TIME = 3;
  static FLASHING_PALETTE = {
    color1: {
      originalHex: "#24188C",
      replacementHex: "#FEFEFE",
    },
    color2: {
      originalHex: "#FC9838",
      replacementHex: "#1412A8",
    },
    color3: {
      originalHex: "#D82800",
      replacementHex: "#D82800",
    },
  };

  constructor(game, x, y) {
    super(game, x, y, 16, 32, new Sprite("assets/images/player_big.png", 16, 32));

    // Gameplay state
    this.canMove = true;
    this.animationState = ObjPlayer.ANIMATION_STATE.STANDING;

    // Physics state
    this.dx = 0;
    this.dy = 0;
    this.isBig = true;
    this.isDucking = false;
    this.inAir = true;
    this.headStuckInWall = false;

    // Timers
    this.jumpBufferTimer = 0;
    this.crouchJumpBuildupTimer = 0;
    this.digTimer = 0;
  }

  update() {
    this.#handleDucking();
    this.#handleDiggingTimer();

    if (this.canMove) {
      this.#handleUnstuckHead();
      this.#updatePhysicsPosition();
      this.#handleHorizontalPhysics();
      this.#handleVerticalPhysics();
    }

    this.#handleCollision();
    this.#handleScreenSides();
    this.#updateAnimationState();
  }

  draw(ctx) {
    this.#updateFrameIndex();
    super.draw(ctx);
    if (this.crouchJumpBuildupTimer === ObjPlayer.CROUCH_JUMP_BUILDUP_TIME && this.game.frame % 2 === 0) {
      this.#drawFlashingPalette(ctx, Math.round(this.x), Math.round(this.y), this.sprite.frameWidth, this.sprite.frameHeight);
    }
  }

  // Set which animation frame to use
  #updateFrameIndex() {
    switch (this.animationState) {
      case ObjPlayer.ANIMATION_STATE.STANDING:
        this.sprite.frameIndex = 0;
        break;

      case ObjPlayer.ANIMATION_STATE.WALKING:
      case ObjPlayer.ANIMATION_STATE.RUNNING: {
        const frame_time =
          this.animationState === ObjPlayer.ANIMATION_STATE.WALKING ? ObjPlayer.WALK_FRAME_TIME : ObjPlayer.RUN_FRAME_TIME;
        this.sprite.frameIndex = Math.floor(this.game.frame / frame_time) % 2;
        break;
      }

      case ObjPlayer.ANIMATION_STATE.FALLING:
        // Just use that previous frame
        break;

      case ObjPlayer.ANIMATION_STATE.JUMPING:
        this.sprite.frameIndex = 2;
        break;

      case ObjPlayer.ANIMATION_STATE.DUCKING:
        this.sprite.frameIndex = 6;
        break;

      case ObjPlayer.ANIMATION_STATE.DIGGING:
        this.sprite.frameIndex = this.digTimer > 7 ? 3 : 7;
        break;
    }
  }

  // The flashing colors used when player can do a super crouch jump
  #drawFlashingPalette(ctx, x, y, width, height) {
    // Get image data for the drawn area (this includes everything, not just the player)
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    function hexToRgb(hex) {
      hex = hex.replace("#", "");
      return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
    }

    // Map current colors to their replacements
    const palette = Object.values(ObjPlayer.FLASHING_PALETTE).map(({ originalHex, replacementHex }) => ({
      original: hexToRgb(originalHex),
      replacement: hexToRgb(replacementHex),
    }));

    // Swap colors in the image data
    for (let i = 0; i < data.length; i += 4) {
      for (const { original, replacement } of palette) {
        if (data[i] === original[0] && data[i + 1] === original[1] && data[i + 2] === original[2] && data[i + 3] === 255) {
          data[i] = replacement[0];
          data[i + 1] = replacement[1];
          data[i + 2] = replacement[2];
        }
      }
    }
    ctx.putImageData(imageData, Math.round(x), Math.round(y));
  }

  #handleDiggingTimer() {
    if (this.digTimer > 0) this.digTimer -= 1;
    if (this.digTimer === 1) this.canMove = true;
  }

  #handleDucking() {
    if (!this.inAir) {
      this.isDucking = input.down;
      if (this.isDucking) {
        this.crouchJumpBuildupTimer = Math.min(this.crouchJumpBuildupTimer + 1, ObjPlayer.CROUCH_JUMP_BUILDUP_TIME);
      } else {
        if (this.crouchJumpBuildupTimer !== ObjPlayer.CROUCH_JUMP_BUILDUP_TIME) this.crouchJumpBuildupTimer = 0;
      }
    }
  }

  // Floating point values used for physics. GFX is just this rounded.
  #updatePhysicsPosition() {
    this.x += this.dx;
    this.y += Math.min(ObjPlayer.TERMINAL_VELOCITY, this.dy);
  }

  #handleHorizontalPhysics() {
    const topSpeed = input.b ? ObjPlayer.RUN_SPEED : ObjPlayer.WALK_SPEED;
    const absDx = Math.abs(this.dx);
    const signDx = Math.sign(this.dx);

    const inputHitDirection = this.isDucking && !this.inAir ? 0 : input.right - input.left;
    if (inputHitDirection !== 0) {
      this.sprite.facingRight = inputHitDirection > 0;
      this.crouchJumpBuildupTimer = 0;
    }

    if (inputHitDirection === 0) {
      // No direction was hit, so decelerate quicker
      if (!this.inAir) {
        if (this.dx < 0) {
          this.dx += ObjPlayer.DECELERATION_NO_INPUT;
          if (this.dx > 0) this.dx = 0;
        } else if (this.dx > 0) {
          this.dx -= ObjPlayer.DECELERATION_NO_INPUT;
          if (this.dx < 0) this.dx = 0;
        }
      }
    } else {
      if ((this.dx > 0 && inputHitDirection < 0) || (this.dx < 0 && inputHitDirection > 0)) {
        // Turning around
        this.dx += inputHitDirection * ObjPlayer.DECELERATION;
      } else if (absDx < topSpeed) {
        // Accelerating
        this.dx += inputHitDirection * ObjPlayer.ACCELERATION;
      } else if (absDx > topSpeed) {
        // Player is going too fast, decelerate to top speed
        if (!this.inAir) {
          this.dx -= signDx * ObjPlayer.DECELERATION;
        }
      }
    }

    // If player is running then stops holding the run button, their x speed instantly gets set to max walk speed, even when in air.
    if (absDx > ObjPlayer.WALK_SPEED && topSpeed === ObjPlayer.WALK_SPEED) {
      this.dx = signDx * ObjPlayer.WALK_SPEED;
    }

    // If the player is going faster than the max speed, clamp it down.
    if (absDx > ObjPlayer.X_SPEED_LIMIT) {
      this.dx = signDx * ObjPlayer.X_SPEED_LIMIT;
    }
  }

  #handleVerticalPhysics() {
    // Impose gravity
    if (this.inAir) {
      if (input.a) {
        this.dy = Math.min(this.dy + ObjPlayer.GRAVITY_JUMP_HELD, ObjPlayer.TERMINAL_VELOCITY);
      } else {
        this.dy = Math.min(this.dy + ObjPlayer.GRAVITY_NO_JUMP_HELD, ObjPlayer.TERMINAL_VELOCITY);
      }
    }

    // Jump input foregiveness
    if (inputPressed.a) {
      this.jumpBufferTimer = ObjPlayer.JUMP_BUFFER_WINDOW;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer--;
    }

    // Actually jump
    if (!this.inAir && input.a && this.jumpBufferTimer) {
      const abs_jump_liftoff_dx = Math.floor(Math.abs(this.dx));
      if (this.crouchJumpBuildupTimer === ObjPlayer.CROUCH_JUMP_BUILDUP_TIME) {
        this.dy = ObjPlayer.JUMP_FORCE_CROUCH;
      } else if (abs_jump_liftoff_dx < ObjPlayer.X_SPEED_NEEDED_FOR_HIGH_JUMP) {
        this.dy = ObjPlayer.JUMP_FORCE_WEAK;
      } else {
        this.dy = ObjPlayer.JUMP_FORCE_STRONG;
      }
      this.inAir = true;
      this.crouchJumpBuildupTimer = 0;
      this.game.soundManager.play("jump");
    }
  }

  // This is basically when the player tries to stand up in a 1-tile high space
  #handleUnstuckHead() {
    const height_offset = !this.isBig || this.isDucking ? ObjPlayer.HEAD_CHECK_OFFSETS.small : ObjPlayer.HEAD_CHECK_OFFSETS.big;
    const tile_above = this.game.tilemap.meetingSolidTileAt(this.x + 8, this.y + height_offset);
    this.headStuckInWall = tile_above && !this.inAir;
    if (this.headStuckInWall) {
      this.dx = 0;
      this.x += 1;
    }
  }

  #handleCollision() {
    // Use integers for tile collision checks
    const roundX = Math.round(this.x);
    const roundY = Math.round(this.y);

    // Get the correct collision offsets based on player size and ducking state
    const colOffsets =
      !this.isBig || this.isDucking ? ObjPlayer.TILE_COLLISION_OFFSETS.small : ObjPlayer.TILE_COLLISION_OFFSETS.big;

    // Horizontal collision detection
    // Use the side offsets based on which wall player is closer to
    const checkingRightWall = roundX % 16 < 8;
    const horizOffsets = checkingRightWall ? colOffsets.downLeft : colOffsets.downRight;

    // Get the side probe points, and check for solid tiles
    const tHoriz0 = horizOffsets.horiz[0];
    const tHoriz1 = horizOffsets.horiz[1];

    const solidHoriz1 = this.game.tilemap.meetingSolidTileAt(roundX + tHoriz0.x, roundY + tHoriz0.y);
    const solidHoriz2 = this.game.tilemap.meetingSolidTileAt(roundX + tHoriz1.x, roundY + tHoriz1.y);

    const solidHoriz = solidHoriz1 || solidHoriz2;

    // Horizontal collision resolution
    if (solidHoriz && !this.headStuckInWall) {
      // Determine direction to nudge player away from wall based on which wall is being checked
      const nudgeOutBy = checkingRightWall ? -1 : 1;

      // Get edge offsets
      const leftEdgeOffset = colOffsets.downRight.horiz[0].x;
      const rightEdgeOffset = colOffsets.downLeft.horiz[0].x;
      const edgeOffset = checkingRightWall ? leftEdgeOffset : rightEdgeOffset;
      const edgeX = roundX + edgeOffset;
      const localX = edgeX % 16;

      // If not perfectly aligned to tile edge, nudge player out of wall
      if (Math.floor(localX) !== 0) {
        this.x += nudgeOutBy;
        // Stop horizontal movement if pushing against wall
        if ((this.dx < 0 && nudgeOutBy === 1) || (this.dx >= 0 && nudgeOutBy === -1)) {
          this.dx = 0;
        }
      }
    }

    // Vertical collision detection
    // Use the 1 head point if going up, else 2 feet points if going down or standing
    const playerIsMovingDown = this.dy >= 0 || !this.inAir;
    const vertOffsets = !playerIsMovingDown
      ? checkingRightWall
        ? colOffsets.upLeft
        : colOffsets.upRight
      : checkingRightWall
      ? colOffsets.downLeft
      : colOffsets.downRight;

    const tVert0 = vertOffsets.vert[0];
    const tVert1 = vertOffsets.vert[1];
    const solidVert1 = this.game.tilemap.meetingSolidTileAt(roundX + tVert0.x, roundY + tVert0.y, playerIsMovingDown);
    const solidVert2 = this.game.tilemap.meetingSolidTileAt(roundX + tVert1.x, roundY + tVert1.y, playerIsMovingDown);
    const solidVert = solidVert1 || solidVert2;

    // Allow player to dig sand if both feet are on the same tile
    if (
      !this.isDucking &&
      !this.inAir &&
      solidVert1 &&
      solidVert2 &&
      inputPressed.b &&
      this.game.tilemap.getTileAtPixel(roundX + tVert0.x, roundY + tVert0.y + 2) === TILES.sand.char &&
      Math.floor((roundX + tVert0.x) / 16) === Math.floor((roundX + tVert1.x) / 16) &&
      this.digTimer === 0
    ) {
      this.game.tilemap.setTileAtPixel(roundX + 8, roundY + 33, TILES.air.char); // Remove sand below feet
      this.canMove = false;
      this.digTimer = ObjPlayer.DIG_DURATION;
      this.game.tilemap.findTextInSand();
      this.game.soundManager.play("dig");
      this.game.gameObjects.push(new ObjSandEffect(this.game, Math.floor((roundX + tVert0.x) / 16) * 16, roundY + 32, 16, 16));
    }

    // Vertical collision resolution
    if (playerIsMovingDown) {
      // If moving down (falling or standing), check if feet are inside a solid tile
      if (solidVert) {
        const localY = Math.floor(roundY % 16); // Y position within the tile (0-15)
        // If player is slightly inside the ground, nudge them up to stand on top
        if (localY < 6) {
          if (localY === 1) {
            this.y -= 1; // Move up by 1 pixel if barely inside
          } else if (localY !== 0) {
            this.y -= 2; // Move up by 2 pixels if deeper inside
          }
          this.inAir = false;
          this.dy = 0;
        }
      } else if (!this.inAir) {
        // If somehow not on ground and not in air, fix that
        this.dy = 0;
        this.inAir = true;
      }
    } else {
      // If moving up (jumping), check if head hits a ceiling
      if (solidVert) {
        this.jumpBufferTimer = 0; // Prevent repeated jumping into ceiling
        this.dy = 2; // Player gets bonked down
        this.game.soundManager.play("bump");
      }
    }
  }

  // Prevent player from going off screen if they somehow managed to glitch out the room
  #handleScreenSides() {
    if (this.x < 0) {
      this.x = 0;
      this.dx = 0;
    } else if (this.x + this.width > this.game.canvas.width) {
      this.x = this.game.canvas.width - this.width;
      this.dx = 0;
    } else if (this.y > this.game.canvas.height) {
      this.y = this.yStart;
    }
  }

  // Update the animation state based on player conditions
  #updateAnimationState() {
    if (this.digTimer !== 0) {
      this.animationState = ObjPlayer.ANIMATION_STATE.DIGGING;
    } else if (this.isDucking) {
      this.animationState = ObjPlayer.ANIMATION_STATE.DUCKING;
    } else if (this.inAir) {
      if (this.dy < 0) {
        this.animationState = ObjPlayer.ANIMATION_STATE.JUMPING;
      } else {
        this.animationState = ObjPlayer.ANIMATION_STATE.FALLING;
      }
    } else if (Math.abs(this.dx) === 0 && input.right - input.left === 0) {
      this.animationState = ObjPlayer.ANIMATION_STATE.STANDING;
    } else {
      this.animationState =
        Math.abs(this.dx) > ObjPlayer.WALK_SPEED ? ObjPlayer.ANIMATION_STATE.RUNNING : ObjPlayer.ANIMATION_STATE.WALKING;
    }
  }
}

export { ObjPlayer };
