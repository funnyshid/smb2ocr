class SoundManager {
  constructor() {
    this.sounds = {
      dig: new Audio("assets/sounds/soundDig.wav"),
      jump: new Audio("assets/sounds/soundJump.wav"),
      bump: new Audio("assets/sounds/soundBump.wav"),
    };
    this.music = new Audio("assets/music/underground.mp3");
    this.music.volume = 0.66;
    this.music.loop = true;
    this.currentlyPlaying = new Set();
  }

  play(soundKey) {
    const sound = this.sounds[soundKey];
    if (!sound) {
      console.error(`Sound key '${soundKey}' not found.`);
      return;
    }

    if (this.currentlyPlaying.has(soundKey)) {
      return; // Prevent the sound from repeating
    }

    this.currentlyPlaying.add(soundKey);
    sound.currentTime = 0;
    sound.play().finally(() => {
      this.currentlyPlaying.delete(soundKey);
    });
  }

  playMusic() {
    this.music.currentTime = 0;
    this.music.play();
  }
}

export { SoundManager };
