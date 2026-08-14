import { describe, expect, test } from 'bun:test'
import { closeSync, existsSync, fstatSync, openSync, readSync } from 'node:fs'
import { resolveDialogueVoiceKey, getDialogueVoicePath } from '../../src/utils/voiceLines.ts'
import { VOICE_AUDIO_PATH } from '../../src/utils/constants.ts'
import type { DialogueLine } from '../../src/data/types.ts'
import voiceLines from '../../voice_lines.json'

const MIN_VOICE_DURATION_SECONDS = 0.1
// Ogg 页最大 64KB（含页头）；只读文件头与尾部即可完成时长解析
const OGG_TAIL_READ_BYTES = 64 * 1024 + 64
const OGG_HEADER_READ_BYTES = 64

function getOggVorbisDurationSeconds(path: string): number | null {
  const fd = openSync(path, 'r')
  try {
    const head = Buffer.alloc(OGG_HEADER_READ_BYTES)
    const headRead = readSync(fd, head, 0, OGG_HEADER_READ_BYTES, 0)
    const identificationHeader = head.indexOf(Buffer.from([1, 118, 111, 114, 98, 105, 115]))
    if (identificationHeader < 0 || headRead < identificationHeader + 16) return null
    const sampleRate = head.readUInt32LE(identificationHeader + 12)
    if (sampleRate <= 0) return null

    const fileSize = fstatSync(fd).size
    const tailSize = Math.min(fileSize, OGG_TAIL_READ_BYTES)
    const tail = Buffer.alloc(tailSize)
    readSync(fd, tail, 0, tailSize, fileSize - tailSize)
    const finalPage = tail.lastIndexOf(Buffer.from('OggS'))
    if (finalPage < 0 || tailSize - finalPage < 22) return null
    const granulePosition = Number(tail.readBigUInt64LE(finalPage + 6))
    if (!Number.isSafeInteger(granulePosition)) return null
    return granulePosition / sampleRate
  } finally {
    closeSync(fd)
  }
}

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

  test('does not play corrupt audio for silent reaction lines', () => {
    const lines: DialogueLine[] = [{ speaker: 'T', text: '……' }]
    expect(resolveDialogueVoiceKey('DIA_004_MAYOR', lines, 0)).toBeNull()
    expect((voiceLines as Array<{ text: string }>).some(line => line.text === '……')).toBe(false)
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

describe('voice line assets', () => {
  test('all configured voice assets exist at runtime', () => {
    const missing = (voiceLines as Array<{ assetKey?: string }>)
      .map(line => line.assetKey)
      .filter((assetKey): assetKey is string => Boolean(assetKey))
      .filter(assetKey => !existsSync(`assets/${getDialogueVoicePath(assetKey)}`))

    expect(missing).toEqual([])
  })

  test('all configured voice assets contain decodable audio duration', () => {
    const invalid = (voiceLines as Array<{ assetKey?: string }>)
      .map(line => line.assetKey)
      .filter((assetKey): assetKey is string => Boolean(assetKey))
      .filter(assetKey => {
        const duration = getOggVorbisDurationSeconds(`assets/${getDialogueVoicePath(assetKey)}`)
        return duration === null || duration < MIN_VOICE_DURATION_SECONDS
      })

    expect(invalid).toEqual([])
  }, { timeout: 30_000 })
})
