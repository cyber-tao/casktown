import { GAME_CONFIG_DATABASE } from './configDatabase'

export interface MidBattleDialogueTrigger {
  hpThreshold: number
  flag: string
  dialogueId: string
}

export const MID_BATTLE_DIALOGUE_TRIGGERS: Record<string, readonly MidBattleDialogueTrigger[]> = {
  baihu: [{ hpThreshold: 0.7, flag: 'mid_baihu_70', dialogueId: 'DIA_BATTLE_BAIHU_70' }],
  xiaoai_true: [{ hpThreshold: 0.3, flag: 'mid_xiaoai_true_30', dialogueId: 'DIA_BATTLE_XIAOAI_TRUE_30' }],
  wuxiang: [
    { hpThreshold: 0.7, flag: 'mid_wuxiang_70', dialogueId: 'DIA_BATTLE_WUXIANG_70' },
    { hpThreshold: 0.3, flag: 'mid_wuxiang_30', dialogueId: 'DIA_BATTLE_WUXIANG_30' },
  ],
}

export function getTriggeredMidBattleDialogue(
  enemyId: string,
  hp: number,
  maxHp: number,
  getFlag: (flag: string) => unknown,
): MidBattleDialogueTrigger | null {
  if (maxHp <= 0) return null
  const hpRatio = hp / maxHp
  return MID_BATTLE_DIALOGUE_TRIGGERS[enemyId]?.find(trigger => hpRatio <= trigger.hpThreshold && getFlag(trigger.flag) !== true) ?? null
}

export function getMidBattleDialoguePreview(dialogueId: string, fallbackSpeaker: string): string {
  const dialogue = GAME_CONFIG_DATABASE.getTable('dialogues')[dialogueId]
  const firstLine = dialogue?.lines.find(line => line.text.trim().length > 0)
  if (!firstLine) return `${fallbackSpeaker}似乎有什么话要说……`
  return `${firstLine.speaker || fallbackSpeaker}: ${firstLine.text}`
}
