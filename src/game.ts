import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { MapScene } from './scenes/MapScene'
import { BattleScene } from './scenes/BattleScene'
import { GameOverScene } from './scenes/GameOverScene'
import { MenuOverlay } from './scenes/MenuOverlay'
import { DialogueOverlay } from './scenes/DialogueOverlay'
import { SettingsScene } from './scenes/SettingsScene'
import { ShopOverlay } from './scenes/ShopOverlay'
import { TrainingOverlay } from './scenes/TrainingOverlay'
import { RebuildOverlay } from './scenes/RebuildOverlay'
import { CodexOverlay } from './scenes/CodexOverlay'
import { WorldMapOverlay } from './scenes/WorldMapOverlay'

export class CaskTownGame extends Phaser.Game {
  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 960,
      height: 540,
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [BootScene, TitleScene, MapScene, BattleScene, GameOverScene, DialogueOverlay, MenuOverlay, SettingsScene, ShopOverlay, TrainingOverlay, RebuildOverlay, CodexOverlay, WorldMapOverlay],
      input: {
        keyboard: true,
        gamepad: true,
      },
    }
    super(config)
  }
}
