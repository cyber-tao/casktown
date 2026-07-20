import type Phaser from 'phaser'

export type PartyHudObject = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text

export interface PartyHudRow {
  charId: string
  hpBar: Phaser.GameObjects.Rectangle
  mpBar: Phaser.GameObjects.Rectangle
  hpText: Phaser.GameObjects.Text
  mpText: Phaser.GameObjects.Text
  levelText: Phaser.GameObjects.Text
  lastHp?: number
  lastMaxHp?: number
  lastMp?: number
  lastMaxMp?: number
  lastLevel?: number
}

export interface MapSceneFeedback {
  text: string
  success: boolean
}

export interface MapSceneStartData {
  mapId?: string
  feedback?: MapSceneFeedback
}
