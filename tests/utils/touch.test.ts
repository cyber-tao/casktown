import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type Phaser from 'phaser'

let bindTouchText: typeof import('../../src/utils/touch.ts').bindTouchText
let originalWindow: unknown
let originalDocument: unknown
let originalImage: unknown
let originalCanvas: unknown
let originalNavigator: unknown

beforeAll(async () => {
  const runtime = globalThis as unknown as Record<string, unknown>
  originalWindow = runtime.window
  originalDocument = runtime.document
  originalImage = runtime.Image
  originalCanvas = runtime.HTMLCanvasElement
  originalNavigator = runtime.navigator

  ;(globalThis as unknown as { window: unknown }).window = globalThis
  class FakeCanvas {
    style = {}
    parentNode: { removeChild: () => void } | null = null
    getContext(): object {
      return {
        fillRect: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      }
    }
  }
  ;(globalThis as unknown as { Image: unknown }).Image = class {
    onload: (() => void) | null = null
    set src(_value: string) {}
  }
  ;(globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement = FakeCanvas
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

  ;({ bindTouchText } = await import('../../src/utils/touch.ts'))
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
  if (originalNavigator === undefined) delete runtime.navigator
  else runtime.navigator = originalNavigator
})

describe('touch text lifecycle', () => {
  test('removes the resize listener after Phaser clears the destroyed text scene', () => {
    let resizeListener: (() => void) | undefined
    let destroyListener: (() => void) | undefined
    let removedListener: (() => void) | undefined
    const scale = {
      gameSize: { width: 1920, height: 1080 },
      width: 1920,
      height: 1080,
      displaySize: { width: 960, height: 540 },
      on: (_event: string, listener: () => void) => { resizeListener = listener },
      off: (_event: string, listener: () => void) => { removedListener = listener },
    }
    const text = {
      scene: { scale },
      width: 120,
      height: 28,
      input: {},
      setInteractive() { return this },
      once: (_event: string, listener: () => void) => { destroyListener = listener },
      on() { return text },
    } as unknown as Phaser.GameObjects.Text

    bindTouchText(text, () => {})
    ;(text as unknown as { scene?: unknown }).scene = undefined

    expect(() => resizeListener?.()).not.toThrow()
    expect(removedListener).toBe(resizeListener)
    expect(() => destroyListener?.()).not.toThrow()
    expect(removedListener).toBe(resizeListener)
  })
})
