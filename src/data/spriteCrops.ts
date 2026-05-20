export interface SpriteCropConfig {
  key: string
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  outputWidth: number
  outputHeight: number
  offsetX: number
  offsetY: number
}

export const SPRITE_CROPS: Record<string, SpriteCropConfig> = {}
