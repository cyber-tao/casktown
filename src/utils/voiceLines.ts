import voiceLines from '../../voice_lines.json'
import type { DialogueLine } from '../data/types'
import { VOICE_AUDIO_PATH } from './constants'

type VoiceLine = {
  diaId: string
  speaker: string
  text: string
  assetKey?: string
}

const VOICE_LINE_KEYS = (voiceLines as VoiceLine[]).reduce<Record<string, string[]>>((acc, line, index) => {
  const mapKey = `${line.diaId}\n${line.speaker}\n${line.text}`
  ;(acc[mapKey] ??= []).push(line.assetKey ?? `${line.diaId}_${index + 1}`)
  return acc
}, {})

const VOICE_LINE_TEXT_KEYS = (voiceLines as VoiceLine[]).reduce<Record<string, string[]>>((acc, line, index) => {
  const mapKey = `${line.speaker}\n${line.text}`
  ;(acc[mapKey] ??= []).push(line.assetKey ?? `${line.diaId}_${index + 1}`)
  return acc
}, {})

export function resolveDialogueVoiceKey(dialogueId: string, lines: DialogueLine[], lineIndex: number): string | null {
  const line = lines[lineIndex]
  if (!line) return null
  const occurrence = lines
    .slice(0, lineIndex + 1)
    .filter(item => item.speaker === line.speaker && item.text === line.text)
    .length - 1
  const mapKey = `${dialogueId}\n${line.speaker}\n${line.text}`
  const keys = VOICE_LINE_KEYS[mapKey]
  if (keys) return keys[occurrence] ?? keys[0] ?? null
  const textKeys = VOICE_LINE_TEXT_KEYS[`${line.speaker}\n${line.text}`]
  return textKeys?.[occurrence] ?? textKeys?.[0] ?? null
}

export function getDialogueVoicePath(voiceKey: string): string {
  return `${VOICE_AUDIO_PATH.DIRECTORY}/${voiceKey}${VOICE_AUDIO_PATH.EXTENSION}`
}
