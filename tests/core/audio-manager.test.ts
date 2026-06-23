import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { AudioManager as AudioManagerType } from '../../src/core/AudioManager.ts'
import { GameData } from '../../src/core/GameData.ts'

const SOUND_UNLOCKED_EVENT = 'unlocked'
let AudioManagerClass: typeof AudioManagerType
let originalWindow: unknown
let originalDocument: unknown
let originalImage: unknown
let originalCanvas: unknown
let originalAudioContext: unknown
let originalNavigator: unknown

interface FakeSound {
  isPlaying: boolean
  volume: number
  play: () => void
  stop: () => void
  pause: () => void
  destroy: () => void
  setVolume: (value: number) => FakeSound
  once: (eventName: string, listener: () => void) => FakeSound
}

class FakeSoundManager {
  locked = true
  readonly addCalls: string[] = []
  readonly sounds: FakeSound[] = []
  readonly directPlayKeys: string[] = []
  playCalls = 0
  private readonly listeners = new Map<string, Set<() => void>>()

  add(key: string, config: { volume?: number } = {}): FakeSound {
    this.addCalls.push(key)
    const sound: FakeSound = {
      isPlaying: false,
      volume: config.volume ?? 0,
      play: () => {
        sound.isPlaying = true
        this.playCalls++
      },
      stop: () => {
        sound.isPlaying = false
      },
      pause: () => {
        sound.isPlaying = false
      },
      destroy: () => {},
      setVolume: (value: number) => {
        sound.volume = value
        return sound
      },
      once: () => sound,
    }
    this.sounds.push(sound)
    return sound
  }

  play(key: string): void {
    this.directPlayKeys.push(key)
    this.playCalls++
  }

  once(eventName: string, listener: () => void): void {
    const listeners = this.listeners.get(eventName) ?? new Set()
    listeners.add(listener)
    this.listeners.set(eventName, listeners)
  }

  off(eventName: string, listener: () => void): void {
    this.listeners.get(eventName)?.delete(listener)
  }

  unlock(): void {
    this.locked = false
    const listeners = [...(this.listeners.get(SOUND_UNLOCKED_EVENT) ?? [])]
    this.listeners.delete(SOUND_UNLOCKED_EVENT)
    for (const listener of listeners) listener()
  }
}

function createFakeScene(sound: FakeSoundManager): Phaser.Scene {
  return {
    sound,
    cache: {
      audio: {
        exists: () => true,
      },
    },
    tweens: {
      add: ({ targets, volume, onComplete }: { targets: FakeSound; volume?: number; onComplete?: () => void }) => {
        if (typeof volume === 'number') targets.volume = volume
        onComplete?.()
      },
      killTweensOf: () => {},
    },
  } as unknown as Phaser.Scene
}

describe('AudioManager', () => {
  beforeAll(async () => {
    const runtime = globalThis as unknown as Record<string, unknown>
    originalWindow = runtime.window
    originalDocument = runtime.document
    originalImage = runtime.Image
    originalCanvas = runtime.HTMLCanvasElement
    originalAudioContext = runtime.AudioContext
    originalNavigator = runtime.navigator

    ;(globalThis as unknown as { window: unknown }).window = globalThis
    const canvasContext = {
      fillStyle: '',
      globalCompositeOperation: '',
      fillRect: () => {},
      drawImage: () => {},
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      getImageData: () => ({ data: new Uint8ClampedArray([10, 20, 30, 128]) }),
    }
    class FakeCanvas {
      style = {}
      parentNode: { removeChild: () => void } | null = null
      getContext(): typeof canvasContext {
        return canvasContext
      }
    }
    ;(globalThis as unknown as { Image: unknown }).Image = class {
      onload: (() => void) | null = null
      set src(_value: string) {}
    }
    ;(globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement = FakeCanvas
    ;(globalThis as unknown as { AudioContext: unknown }).AudioContext = class {
      state = 'running'
      currentTime = 0
      sampleRate = 44100
      destination = {}
      resume(): void {}
    }
    ;(globalThis as unknown as { document: unknown }).document = {
      pointerLockElement: null,
      documentElement: {},
      createElement: (tagName: string) => tagName === 'audio'
        ? { canPlayType: () => '' }
        : new FakeCanvas(),
    }
    if (!('navigator' in globalThis)) {
      ;(globalThis as unknown as { navigator: Record<string, unknown> }).navigator = {}
    }
    ;({ AudioManager: AudioManagerClass } = await import('../../src/core/AudioManager.ts'))
  })

  afterAll(() => {
    const runtime = globalThis as unknown as Record<string, unknown>
    if (originalWindow === undefined) delete runtime.window
    else runtime.window = originalWindow
    if (originalDocument === undefined) delete runtime.document
    else runtime.document = originalDocument
    if (originalImage === undefined) delete runtime.Image
    else runtime.Image = originalImage
    if (originalCanvas === undefined) delete runtime.HTMLCanvasElement
    else runtime.HTMLCanvasElement = originalCanvas
    if (originalAudioContext === undefined) delete runtime.AudioContext
    else runtime.AudioContext = originalAudioContext
    if (originalNavigator === undefined) delete runtime.navigator
    else runtime.navigator = originalNavigator
  })

  beforeEach(() => {
    GameData.getInstance().reset()
  })

  afterEach(() => {
    AudioManagerClass.getInstance().stopBGM(0)
  })

  test('does not create synthesized SFX during singleton setup', () => {
    const runtime = globalThis as unknown as Record<string, unknown>
    const previousAudioContext = runtime.AudioContext
    let constructed = 0
    runtime.AudioContext = class {
      constructor() {
        constructed++
      }
    }

    try {
      expect(() => AudioManagerClass.getInstance()).not.toThrow()
      expect(constructed).toBe(0)
    } finally {
      runtime.AudioContext = previousAudioContext
    }
  })

  test('plays cached SFX without creating synthesized fallback audio', () => {
    const runtime = globalThis as unknown as Record<string, unknown>
    const previousAudioContext = runtime.AudioContext
    let constructed = 0
    runtime.AudioContext = class {
      constructor() {
        constructed++
      }
    }

    try {
      const sound = new FakeSoundManager()
      const manager = AudioManagerClass.getInstance()
      manager.setScene(createFakeScene(sound))

      manager.playSFX('cursor')

      expect(sound.directPlayKeys).toEqual(['sfx_cursor'])
      expect(constructed).toBe(0)
    } finally {
      runtime.AudioContext = previousAudioContext
    }
  })

  test('defers BGM playback until browser audio is unlocked', () => {
    const sound = new FakeSoundManager()
    const manager = AudioManagerClass.getInstance()
    manager.setScene(createFakeScene(sound))

    manager.playBGM('title', 0)

    expect(sound.addCalls).toEqual([])
    expect(sound.playCalls).toBe(0)

    sound.unlock()

    expect(sound.addCalls).toEqual(['bgm_title'])
    expect(sound.playCalls).toBe(1)
  })

  test('keeps the latest pending BGM request while audio is locked', () => {
    const sound = new FakeSoundManager()
    const manager = AudioManagerClass.getInstance()
    manager.setScene(createFakeScene(sound))

    manager.playBGM('title', 0)
    manager.playBGM('battle_normal', 0)
    sound.unlock()

    expect(sound.addCalls).toEqual(['bgm_battle_normal'])
    expect(sound.playCalls).toBe(1)
  })

  test('updates the currently playing voice volume when settings change', () => {
    const sound = new FakeSoundManager()
    const manager = AudioManagerClass.getInstance()
    manager.setScene(createFakeScene(sound))

    manager.playVoice('DIA_TEST', 'Test line')

    expect(sound.addCalls).toEqual(['voice_DIA_TEST'])
    expect(sound.sounds.at(-1)?.volume).toBe(1)

    GameData.getInstance().settings.masterVolume = 0.5
    GameData.getInstance().settings.uiVolume = 0.4
    manager.updateVolume()

    expect(sound.sounds.at(-1)?.volume).toBe(0.2)
    manager.stopVoice()
  })
})
