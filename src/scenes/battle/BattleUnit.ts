import type Phaser from 'phaser'
import type { CharacterData, EnemyData } from '../../data/types'

export interface BattleUnit {
  id: string
  name: string
  isPlayer: boolean
  stats: { hp: number; maxHp: number; mp: number; maxMp: number; speed: number }
  sprite?: Phaser.GameObjects.Sprite
  hpBar?: Phaser.GameObjects.Rectangle
  mpBar?: Phaser.GameObjects.Rectangle
  tpBar?: Phaser.GameObjects.Rectangle
  statusText?: Phaser.GameObjects.Text
  breakGauge: number
  breakMax: number
  tp: number
  status: string[]
  data: CharacterData | EnemyData
}
