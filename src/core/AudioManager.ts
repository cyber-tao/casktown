import Phaser from 'phaser'
import { GameData } from './GameData'
import { SFXSynth } from './SFXSynth'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { BGM_FADE_DURATIONS, VOICE_AUDIO_PATH } from '../utils/constants'

export class AudioManager {
  private static instance: AudioManager
  private scene: Phaser.Scene | null = null
  private currentBgm: Phaser.Sound.BaseSound | null = null
  private currentBgmKey: string = ''
  private bgmSounds: Set<Phaser.Sound.BaseSound> = new Set()
  private bgmTweenScenes = new WeakMap<Phaser.Sound.BaseSound, Phaser.Scene>()
  private bgmMuted = false
  private sfxMuted = false
  private voiceMuted = false
  private currentVoice: Phaser.Sound.BaseSound | null = null
  private requestedVoiceKey = ''
  private requestedBgmId = ''
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
    const title = GAME_CONFIG_DATABASE.getTable('bgmTracks').title
    if (title) {
      loader.audio(title.key, title.path)
    }
  }

  playBGM(bgmId: string, fadeDuration: number = BGM_FADE_DURATIONS.DEFAULT_MS): void {
    if (!this.scene) return
    const config = GAME_CONFIG_DATABASE.getTable('bgmTracks')[bgmId]
    if (!config) {
      console.warn(`BGM ${bgmId} not found`)
      return
    }

    if (this.currentBgmKey === bgmId && this.currentBgm?.isPlaying) return

    const gd = GameData.getInstance()
    const masterVol = gd.settings.masterVolume
    const musicVol = gd.settings.musicVolume
    const targetVolume = this.bgmMuted ? 0 : config.volume * masterVol * musicVol

    this.stopBGM(BGM_FADE_DURATIONS.NONE_MS)

    if (!this.scene.cache.audio.exists(config.key)) {
      if (this.requestedBgmId === bgmId) return
      this.requestedBgmId = bgmId
      this.scene.load.audio(config.key, config.path)
      this.scene.load.once(`filecomplete-audio-${config.key}`, () => {
        if (this.scene && this.requestedBgmId === bgmId) {
          this.requestedBgmId = ''
          this.playBGM(bgmId, fadeDuration)
        }
      })
      this.scene.load.once(`loaderror-audio-${config.key}`, () => {
        if (this.requestedBgmId === bgmId) this.requestedBgmId = ''
        console.warn(`Audio ${config.key} failed to load`)
      })
      this.scene.load.start()
      return
    }

    this.currentBgm = this.scene.sound.add(config.key, {
      loop: config.loop,
      volume: 0,
    })
    this.bgmSounds.add(this.currentBgm)
    this.bgmTweenScenes.set(this.currentBgm, this.scene)
    this.currentBgmKey = bgmId
    this.requestedBgmId = ''
    this.currentBgm.play()

    this.scene.tweens.add({
      targets: this.currentBgm,
      volume: targetVolume,
      duration: fadeDuration,
    })
  }

  stopBGM(fadeDuration: number = BGM_FADE_DURATIONS.DEFAULT_MS): void {
    if (this.bgmSounds.size === 0 && !this.currentBgm) return
    const sounds = new Set(this.bgmSounds)
    if (this.currentBgm) sounds.add(this.currentBgm)
    for (const bgm of sounds) {
      if (!bgm.isPlaying || !this.scene || fadeDuration <= BGM_FADE_DURATIONS.NONE_MS) {
        this.destroyBGM(bgm)
        continue
      }
      this.scene.tweens.killTweensOf(bgm)
      this.bgmTweenScenes.set(bgm, this.scene)
      this.scene.tweens.add({
        targets: bgm,
        volume: 0,
        duration: fadeDuration,
        onComplete: () => this.destroyBGM(bgm),
      })
    }
    this.currentBgm = null
    this.currentBgmKey = ''
  }

  private destroyBGM(bgm: Phaser.Sound.BaseSound): void {
    const tweenScene = this.bgmTweenScenes.get(bgm)
    tweenScene?.tweens.killTweensOf(bgm)
    if (this.scene && this.scene !== tweenScene) this.scene.tweens.killTweensOf(bgm)
    if (bgm.isPlaying) bgm.stop()
    bgm.destroy()
    this.bgmTweenScenes.delete(bgm)
    this.bgmSounds.delete(bgm)
    if (this.currentBgm === bgm) {
      this.currentBgm = null
      this.currentBgmKey = ''
    }
  }

  playSFX(sfxId: string): void {
    if (this.sfxMuted) return
    const config = GAME_CONFIG_DATABASE.getTable('sfxTracks')[sfxId]
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

    const path = `${VOICE_AUDIO_PATH.DIRECTORY}/${voiceKey}${VOICE_AUDIO_PATH.EXTENSION}`
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
    const bgmId = GAME_CONFIG_DATABASE.getTable('maps')[mapId]?.bgm ?? GAME_CONFIG_DATABASE.getTable('mapBgm')[mapId]
    if (bgmId) {
      this.playBGM(bgmId)
    }
  }

  playBattleBGM(isBoss: boolean): void {
    this.playBGM(isBoss ? 'battle_boss' : 'battle_normal')
  }

  playVictoryBGM(): void {
    this.playBGM('victory', BGM_FADE_DURATIONS.FAST_MS)
  }

  playGameOverBGM(): void {
    this.playBGM('game_over', BGM_FADE_DURATIONS.FAST_MS)
  }

  updateVolume(): void {
    if (!this.currentBgm) return
    const gd = GameData.getInstance()
    const config = GAME_CONFIG_DATABASE.getTable('bgmTracks')[this.currentBgmKey]
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
