import { GameData } from './GameData'
import { InputManager } from './InputManager'
import { QUICK_SAVE_SLOT, SAVE_SLOTS, SAVE_STORAGE_KEY } from '../utils/constants'

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

  private isValidSlot(slot: number): boolean {
    return (slot >= 1 && slot <= SAVE_SLOTS) || slot === QUICK_SAVE_SLOT
  }

  private getStorage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage ?? null
    } catch (e) {
      console.warn('Local save storage is unavailable:', e)
      return null
    }
  }

  save(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      const data = this.gameData.serialize()
      const meta: SaveMeta = {
        slot,
        timestamp: Date.now(),
        playTime: this.gameData.playTime,
        currentMap: this.gameData.currentMap,
        preview: this.gameData.party.join(', '),
      }
      storage.setItem(`${SAVE_STORAGE_KEY}_data_${slot}`, JSON.stringify(data))
      storage.setItem(`${SAVE_STORAGE_KEY}_meta_${slot}`, JSON.stringify(meta))
      return true
    } catch (e) {
      console.error('Save failed:', e)
      return false
    }
  }

  load(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`)
      if (!raw) return false
      const data = JSON.parse(raw)
      this.gameData.deserialize(data)
      InputManager.getInstance().syncFromGameData()
      return true
    } catch (e) {
      console.error('Load failed:', e)
      return false
    }
  }

  getMeta(slot: number): SaveMeta | null {
    const storage = this.getStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_meta_${slot}`)
      return raw ? (JSON.parse(raw) as SaveMeta) : null
    } catch {
      return null
    }
  }

  hasSave(slot: number): boolean {
    const storage = this.getStorage()
    if (!storage) return false
    try {
      return storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`) !== null
    } catch {
      return false
    }
  }

  deleteSave(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      storage.removeItem(`${SAVE_STORAGE_KEY}_data_${slot}`)
      storage.removeItem(`${SAVE_STORAGE_KEY}_meta_${slot}`)
      return true
    } catch (e) {
      console.error('Delete save failed:', e)
      return false
    }
  }

  quickSave(): boolean {
    return this.save(QUICK_SAVE_SLOT)
  }

  quickLoad(): boolean {
    return this.load(QUICK_SAVE_SLOT)
  }

  exportSave(slot: number): string | null {
    const storage = this.getStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`)
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
