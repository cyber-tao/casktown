import { describe, expect, test } from 'bun:test'
import { MID_BATTLE_DIALOGUE_TRIGGERS, getMidBattleDialoguePreview, getTriggeredMidBattleDialogue } from '../../src/data/battleDialogues.ts'
import { DIALOGUES } from '../../src/data/dialogues.ts'
import { BATTLE_RULES } from '../../src/utils/constants.ts'

describe('mid-battle dialogue triggers', () => {
  test('reference authored dialogue snippets with visible text', () => {
    const errors: string[] = []
    for (const [enemyId, triggers] of Object.entries(MID_BATTLE_DIALOGUE_TRIGGERS)) {
      for (const trigger of triggers) {
        const dialogue = DIALOGUES[trigger.dialogueId]
        if (!dialogue) {
          errors.push(`${enemyId}/${trigger.flag} references missing dialogue ${trigger.dialogueId}`)
          continue
        }
        if (!dialogue.lines.some(line => line.text.trim().length > 0)) {
          errors.push(`${enemyId}/${trigger.flag} has no visible dialogue text`)
        }
      }
    }

    expect(errors).toEqual([])
  })

  test('white tiger prompt can trigger before the trial auto-completes', () => {
    const baihuTrigger = MID_BATTLE_DIALOGUE_TRIGGERS.baihu?.[0]

    expect(baihuTrigger).toBeDefined()
    expect(baihuTrigger!.hpThreshold).toBeGreaterThan(BATTLE_RULES.BAIHU_TRIAL_HP_RATIO)
  })

  test('preview uses the authored speaker and first line', () => {
    expect(getMidBattleDialoguePreview('DIA_BATTLE_WUXIANG_70', '无相')).toContain('无相: 看看你们身后的影子')
  })

  test('trigger selection respects hp thresholds and one-shot flags', () => {
    expect(getTriggeredMidBattleDialogue('wuxiang', 71, 100, () => false)).toBeNull()
    expect(getTriggeredMidBattleDialogue('wuxiang', 70, 100, () => false)?.flag).toBe('mid_wuxiang_70')
    expect(getTriggeredMidBattleDialogue('wuxiang', 30, 100, flag => flag === 'mid_wuxiang_70')?.flag).toBe('mid_wuxiang_30')
    expect(getTriggeredMidBattleDialogue('wuxiang', 30, 100, () => true)).toBeNull()
  })
})
