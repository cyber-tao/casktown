import Phaser from 'phaser'
import { EventBus, GameEvents } from './EventBus'
import { GameData } from './GameData'
import { SFXSynth } from './SFXSynth'

interface BGMConfig {
  key: string
  path: string
  loop: boolean
  volume: number
}

interface SFXConfig {
  key: string
  path: string
  volume: number
}

export const BGM_TRACKS: Record<string, BGMConfig> = {
  title: { key: 'bgm_title', path: 'audio/bgm/title.ogg', loop: true, volume: 0.7 },
  town_ruins: { key: 'bgm_town_ruins', path: 'audio/bgm/town_ruins.ogg', loop: true, volume: 0.6 },
  town_rebuilt: { key: 'bgm_town_rebuilt', path: 'audio/bgm/town_rebuilt.ogg', loop: true, volume: 0.6 },
  forest: { key: 'bgm_forest', path: 'audio/bgm/forest.ogg', loop: true, volume: 0.6 },
  forest_mystery: { key: 'bgm_forest_mystery', path: 'audio/bgm/forest.ogg', loop: true, volume: 0.5 },
  holy_water: { key: 'bgm_holy_water', path: 'audio/bgm/holy_water.ogg', loop: true, volume: 0.6 },
  holy_temple: { key: 'bgm_holy_temple', path: 'audio/bgm/holy_temple.ogg', loop: true, volume: 0.6 },
  mountain: { key: 'bgm_mountain', path: 'audio/bgm/mountain.ogg', loop: true, volume: 0.6 },
  mystery: { key: 'bgm_mystery', path: 'audio/bgm/mystery.ogg', loop: true, volume: 0.5 },
  temple: { key: 'bgm_temple', path: 'audio/bgm/temple.ogg', loop: true, volume: 0.6 },
  dock: { key: 'bgm_dock', path: 'audio/bgm/dock.ogg', loop: true, volume: 0.5 },
  battle_normal: { key: 'bgm_battle_normal', path: 'audio/bgm/battle_normal.ogg', loop: true, volume: 0.7 },
  battle_boss: { key: 'bgm_battle_boss', path: 'audio/bgm/battle_boss.ogg', loop: true, volume: 0.8 },
  life_spring: { key: 'bgm_life_spring', path: 'audio/bgm/life_spring.ogg', loop: true, volume: 0.5 },
  dark_palace: { key: 'bgm_dark_palace', path: 'audio/bgm/dark_palace.ogg', loop: true, volume: 0.6 },
  xiaoai_battle: { key: 'bgm_xiaoai_battle', path: 'audio/bgm/xiaoai_battle.ogg', loop: true, volume: 0.8 },
  wuxiang_battle: { key: 'bgm_wuxiang_battle', path: 'audio/bgm/wuxiang_battle.ogg', loop: true, volume: 0.8 },
  victory: { key: 'bgm_victory', path: 'audio/bgm/victory.ogg', loop: false, volume: 0.7 },
  game_over: { key: 'bgm_game_over', path: 'audio/bgm/game_over.ogg', loop: false, volume: 0.6 },
}

export const SFX_TRACKS: Record<string, SFXConfig> = {
  cursor: { key: 'sfx_cursor', path: 'audio/sfx/cursor.ogg', volume: 0.5 },
  confirm: { key: 'sfx_confirm', path: 'audio/sfx/confirm.ogg', volume: 0.6 },
  cancel: { key: 'sfx_cancel', path: 'audio/sfx/cancel.ogg', volume: 0.5 },
  battle_start: { key: 'sfx_battle_start', path: 'audio/sfx/battle_start.ogg', volume: 0.7 },
  attack_hit: { key: 'sfx_attack_hit', path: 'audio/sfx/attack_hit.ogg', volume: 0.6 },
  attack_slash: { key: 'sfx_attack_slash', path: 'audio/sfx/attack_slash.ogg', volume: 0.6 },
  magic_cast: { key: 'sfx_magic_cast', path: 'audio/sfx/magic_cast.ogg', volume: 0.6 },
  heal: { key: 'sfx_heal', path: 'audio/sfx/heal.ogg', volume: 0.6 },
  item_use: { key: 'sfx_item_use', path: 'audio/sfx/item_use.ogg', volume: 0.5 },
  level_up: { key: 'sfx_level_up', path: 'audio/sfx/level_up.ogg', volume: 0.7 },
  dialogue_advance: { key: 'sfx_dialogue', path: 'audio/sfx/dialogue.ogg', volume: 0.3 },
  step_grass: { key: 'sfx_step_grass', path: 'audio/sfx/step_grass.ogg', volume: 0.2 },
  step_stone: { key: 'sfx_step_stone', path: 'audio/sfx/step_stone.ogg', volume: 0.2 },
  encounter: { key: 'sfx_encounter', path: 'audio/sfx/encounter.ogg', volume: 0.7 },
  victory_fanfare: { key: 'sfx_victory', path: 'audio/sfx/victory.ogg', volume: 0.8 },
  open_menu: { key: 'sfx_open_menu', path: 'audio/sfx/open_menu.ogg', volume: 0.5 },
  close_menu: { key: 'sfx_close_menu', path: 'audio/sfx/close_menu.ogg', volume: 0.5 },
  equip: { key: 'sfx_equip', path: 'audio/sfx/equip.ogg', volume: 0.5 },
  get_item: { key: 'sfx_get_item', path: 'audio/sfx/get_item.ogg', volume: 0.6 },
  warp: { key: 'sfx_warp', path: 'audio/sfx/warp.ogg', volume: 0.6 },
}

export const MAP_BGM_MAP: Record<string, string> = {
  MAP_001: 'town_ruins',
  MAP_002: 'town_rebuilt',
  MAP_010: 'forest',
  MAP_011: 'forest',
  MAP_012: 'forest_mystery',
  MAP_020: 'dock',
  MAP_030: 'holy_water',
  MAP_031: 'holy_temple',
  MAP_040: 'mountain',
  MAP_041: 'mystery',
  MAP_042: 'temple',
  MAP_050: 'life_spring',
  MAP_060: 'dark_palace',
  MAP_062: 'dark_palace',
  MAP_070: 'wuxiang_battle',
}

export class AudioManager {
  private static instance: AudioManager
  private scene: Phaser.Scene | null = null
  private currentBgm: Phaser.Sound.BaseSound | null = null
  private currentBgmKey: string = ''
  private bgmMuted = false
  private sfxMuted = false
  private voiceMuted = false
  private currentVoice: Phaser.Sound.BaseSound | null = null
  private requestedVoiceKey = ''
  private sfxSynth: SFXSynth | null = null

  private constructor() {
    this.sfxSynth = new SFXSynth()
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  setScene(scene: Phaser.Scene): void {
    this.scene = scene
  }

  preload(loader: Phaser.Loader.LoaderPlugin): void {
    for (const bgm of Object.values(BGM_TRACKS)) {
      loader.audio(bgm.key, bgm.path)
    }
  }

  playBGM(bgmId: string, fadeDuration = 1000): void {
    if (!this.scene) return
    const config = BGM_TRACKS[bgmId]
    if (!config) {
      console.warn(`BGM ${bgmId} not found`)
      return
    }

    if (this.currentBgmKey === bgmId && this.currentBgm?.isPlaying) return

    const gd = GameData.getInstance()
    const masterVol = gd.settings.masterVolume
    const musicVol = gd.settings.musicVolume
    const targetVolume = this.bgmMuted ? 0 : config.volume * masterVol * musicVol

    if (this.currentBgm?.isPlaying) {
      const oldBgm = this.currentBgm
      this.scene.tweens.add({
        targets: oldBgm,
        volume: 0,
        duration: fadeDuration,
        onComplete: () => {
          oldBgm.stop()
        },
      })
    }

    if (!this.scene.cache.audio.exists(config.key)) {
      console.warn(`Audio ${config.key} not loaded`)
      return
    }

    this.currentBgm = this.scene.sound.add(config.key, {
      loop: config.loop,
      volume: 0,
    })
    this.currentBgmKey = bgmId
    this.currentBgm.play()

    this.scene.tweens.add({
      targets: this.currentBgm,
      volume: targetVolume,
      duration: fadeDuration,
    })
  }

  stopBGM(fadeDuration = 1000): void {
    if (!this.currentBgm?.isPlaying) return
    if (!this.scene) {
      this.currentBgm.stop()
      return
    }
    const oldBgm = this.currentBgm
    this.scene.tweens.add({
      targets: oldBgm,
      volume: 0,
      duration: fadeDuration,
      onComplete: () => {
        oldBgm.stop()
      },
    })
    this.currentBgm = null
    this.currentBgmKey = ''
  }

  playSFX(sfxId: string): void {
    if (this.sfxMuted) return
    const config = SFX_TRACKS[sfxId]
    if (!config) {
      console.warn(`SFX ${sfxId} not found`)
      return
    }

    const gd = GameData.getInstance()
    const masterVol = gd.settings.masterVolume
    const sfxVol = gd.settings.sfxVolume
    const volume = config.volume * masterVol * sfxVol

    if (this.scene && this.scene.sound.get(config.key)) {
      this.scene.sound.play(config.key, { volume })
      return
    }

    // Fallback to synthesized SFX
    if (!this.sfxSynth) return
    switch (sfxId) {
      case 'cursor': this.sfxSynth.playCursor(); break
      case 'confirm': this.sfxSynth.playConfirm(); break
      case 'cancel': this.sfxSynth.playCancel(); break
      case 'attack_hit': this.sfxSynth.playAttackHit(); break
      case 'attack_slash': this.sfxSynth.playAttackSlash(); break
      case 'magic_cast': this.sfxSynth.playMagicCast(); break
      case 'heal': this.sfxSynth.playHeal(); break
      case 'item_use': this.sfxSynth.playItemUse(); break
      case 'level_up': this.sfxSynth.playLevelUp(); break
      case 'open_menu': this.sfxSynth.playOpenMenu(); break
      case 'close_menu': this.sfxSynth.playCloseMenu(); break
      case 'equip': this.sfxSynth.playEquip(); break
      case 'get_item': this.sfxSynth.playGetItem(); break
      case 'encounter': this.sfxSynth.playEncounter(); break
      case 'step_grass':
      case 'step_stone': this.sfxSynth.playStep(); break
      case 'warp': this.sfxSynth.playWarp(); break
      case 'dialogue_advance': this.sfxSynth.playDialogue(); break
      default: console.warn(`No synth fallback for SFX ${sfxId}`)
    }
  }

  playVoice(voiceKey: string, _text: string): void {
    if (!this.scene || this.voiceMuted) return
    this.stopVoice()

    const gd = GameData.getInstance()
    const masterVol = gd.settings.masterVolume
    const volume = 1.0 * masterVol

    const path = `audio/voice/${voiceKey}.ogg`
    const key = `voice_${voiceKey}`
    this.requestedVoiceKey = key

    if (!this.scene.cache.audio.exists(key)) {
      this.scene.load.audio(key, path)
      this.scene.load.once(`filecomplete-audio-${key}`, () => {
        if (this.scene && this.requestedVoiceKey === key) {
          this.currentVoice = this.scene.sound.add(key, { volume, loop: false })
          this.currentVoice.play()
        }
      })
      this.scene.load.once(`loaderror-audio-${key}`, () => {
        // Voice file not found, skip silently
      })
      this.scene.load.start()
    } else {
      this.currentVoice = this.scene.sound.add(key, { volume, loop: false })
      this.currentVoice.play()
    }
  }

  stopVoice(): void {
    if (this.currentVoice?.isPlaying) {
      this.currentVoice.stop()
    }
    this.currentVoice = null
    this.requestedVoiceKey = ''
  }

  playBGMForMap(mapId: string): void {
    const bgmId = MAP_BGM_MAP[mapId]
    if (bgmId) {
      this.playBGM(bgmId)
    }
  }

  playBattleBGM(isBoss: boolean): void {
    this.playBGM(isBoss ? 'battle_boss' : 'battle_normal')
  }

  playVictoryBGM(): void {
    this.stopBGM(500)
    setTimeout(() => this.playBGM('victory'), 500)
  }

  playGameOverBGM(): void {
    this.stopBGM(500)
    setTimeout(() => this.playBGM('game_over'), 500)
  }

  updateVolume(): void {
    if (!this.currentBgm) return
    const gd = GameData.getInstance()
    const config = BGM_TRACKS[this.currentBgmKey]
    if (!config) return
    const masterVol = gd.settings.masterVolume
    const musicVol = gd.settings.musicVolume
    const targetVolume = this.bgmMuted ? 0 : config.volume * masterVol * musicVol
    ;(this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(targetVolume)
  }

  setBGMMuted(muted: boolean): void {
    this.bgmMuted = muted
    this.updateVolume()
  }

  setSFXMuted(muted: boolean): void {
    this.sfxMuted = muted
  }

  setVoiceMuted(muted: boolean): void {
    this.voiceMuted = muted
    if (muted) this.stopVoice()
  }

  resumeBGM(): void {
    if (this.currentBgm && !this.currentBgm.isPlaying && !this.bgmMuted) {
      this.currentBgm.play()
    }
  }

  pauseBGM(): void {
    if (this.currentBgm?.isPlaying) {
      this.currentBgm.pause()
    }
  }
}
