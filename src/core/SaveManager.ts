import { GameData } from './GameData'
import { SAVE_SLOTS } from '../utils/constants'

const SAVE_KEY = 'casktown_save'

export interface SaveMeta {
  slot: number
  timestamp: number
  playTime: number
  currentMap: string
  preview: string
}

export class SaveManager {
  private static instance: SaveManager
  private gameData: GameData

  private constructor() {
    this.gameData = GameData.getInstance()
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager()
    }
    return SaveManager.instance
  }

  save(slot: number): boolean {
    if (slot < 1 || slot > SAVE_SLOTS) return false
    try {
      const data = this.gameData.serialize()
      const meta: SaveMeta = {
        slot,
        timestamp: Date.now(),
        playTime: this.gameData.playTime,
        currentMap: this.gameData.currentMap,
        preview: this.gameData.party.join(', '),
      }
      localStorage.setItem(`${SAVE_KEY}_data_${slot}`, JSON.stringify(data))
      localStorage.setItem(`${SAVE_KEY}_meta_${slot}`, JSON.stringify(meta))
      return true
    } catch (e) {
      console.error('Save failed:', e)
      return false
    }
  }

  load(slot: number): boolean {
    if (slot < 1 || slot > SAVE_SLOTS) return false
    try {
      const raw = localStorage.getItem(`${SAVE_KEY}_data_${slot}`)
      if (!raw) return false
      const data = JSON.parse(raw)
      this.gameData.deserialize(data)
      return true
    } catch (e) {
      console.error('Load failed:', e)
      return false
    }
  }

  getMeta(slot: number): SaveMeta | null {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY}_meta_${slot}`)
      return raw ? (JSON.parse(raw) as SaveMeta) : null
    } catch {
      return null
    }
  }

  hasSave(slot: number): boolean {
    return localStorage.getItem(`${SAVE_KEY}_data_${slot}`) !== null
  }

  deleteSave(slot: number): boolean {
    if (slot < 1 || slot > SAVE_SLOTS) return false
    localStorage.removeItem(`${SAVE_KEY}_data_${slot}`)
    localStorage.removeItem(`${SAVE_KEY}_meta_${slot}`)
    return true
  }

  quickSave(): boolean {
    return this.save(0)
  }

  quickLoad(): boolean {
    return this.load(0)
  }

  exportSave(slot: number): string | null {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY}_data_${slot}`)
      return raw
    } catch {
      return null
    }
  }

  importSave(slot: number, dataStr: string): boolean {
    try {
      const data = JSON.parse(dataStr)
      this.gameData.deserialize(data)
      return this.save(slot)
    } catch {
      return false
    }
  }
}
