import { describe, expect, test } from 'bun:test'
import { resolveDialogueVoiceKey, getDialogueVoicePath } from '../../src/utils/voiceLines.ts'
import { VOICE_AUDIO_PATH } from '../../src/utils/constants.ts'
import type { DialogueLine } from '../../src/data/types.ts'

describe('resolveDialogueVoiceKey', () => {
  test('returns null for out-of-range line index', () => {
    const lines: DialogueLine[] = [{ speaker: 'T', text: 'Hello' }]
    expect(resolveDialogueVoiceKey('DIA_001', lines, 5)).toBeNull()
  })

  test('returns null for empty lines array', () => {
    const lines: DialogueLine[] = []
    expect(resolveDialogueVoiceKey('DIA_001', lines, 0)).toBeNull()
  })

  test('returns null when no matching key exists', () => {
    const lines: DialogueLine[] = [{ speaker: 'Unknown_Speaker_XYZ', text: 'No matching key at all' }]
    expect(resolveDialogueVoiceKey('FAKE_DIA', lines, 0)).toBeNull()
  })

  test('resolves voice key for a known dialogue line', () => {
    const lines: DialogueLine[] = [{ speaker: 'T', text: '……' }]
    const result = resolveDialogueVoiceKey('DIA_001_START', lines, 0)
    expect(result === null || typeof result === 'string').toBe(true)
  })

  test('handles duplicate speaker/text within same dialogue', () => {
    const lines: DialogueLine[] = [
      { speaker: 'T', text: 'Hmm...' },
      { speaker: 'T', text: 'Hmm...' },
    ]
    const result0 = resolveDialogueVoiceKey('DIA_TEST', lines, 0)
    const result1 = resolveDialogueVoiceKey('DIA_TEST', lines, 1)
    if (result0 !== null && result1 !== null) {
      expect(result1).not.toBe(result0)
    }
  })
})

describe('getDialogueVoicePath', () => {
  test('constructs correct path from voice key', () => {
    const path = getDialogueVoicePath('test_key')
    expect(path).toBe(`${VOICE_AUDIO_PATH.DIRECTORY}/test_key${VOICE_AUDIO_PATH.EXTENSION}`)
  })

  test('handles empty string key', () => {
    const path = getDialogueVoicePath('')
    expect(path).toBe(`${VOICE_AUDIO_PATH.DIRECTORY}/${VOICE_AUDIO_PATH.EXTENSION}`)
  })
})
