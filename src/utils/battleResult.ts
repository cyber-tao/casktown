export type BattleResultFallbackScene = 'MapScene' | 'GameOverScene'

export function getBattleResultFallbackScene(victory: boolean, escaped: boolean): BattleResultFallbackScene {
  return victory || escaped ? 'MapScene' : 'GameOverScene'
}
