import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#101912");
    this.scene.start("PreloadScene");
  }
}
