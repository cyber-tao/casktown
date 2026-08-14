import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIALOGUES } from '../src/data/dialogues'
import {
  JSON_FORMAT_SPACE_COUNT,
  PROCESS_FAILURE_EXIT_CODE,
  PROCESS_SUCCESS_EXIT_CODE,
  PROJECT_ROOT_PARENT_SEGMENT,
  UTF8_FILE_ENCODING,
  VOICE_LINES_FILE,
} from './constants'
import { VOICE_MAP } from './voice-config'

interface VoiceLine {
  diaId: string
  speaker: string
  text: string
  assetKey: string
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, PROJECT_ROOT_PARENT_SEGMENT)
const voiceLinesPath = resolve(projectRoot, VOICE_LINES_FILE)
const voicedSpeakers = new Set(Object.keys(VOICE_MAP))

async function readVoiceLines(): Promise<VoiceLine[]> {
  return JSON.parse(await readFile(voiceLinesPath, UTF8_FILE_ENCODING)) as VoiceLine[]
}

function makeTextKey(speaker: string, text: string): string {
  return `${speaker}\n${text}`
}

// 静默反应行：去除空白与常见标点后无实际文字（如“……”）则不生成配音
const SILENT_TEXT_PATTERN = /^[\s。，！？…、——~～-]*$/

function makeAssetKey(diaId: string, lineIndex: number, usedAssetKeys: Set<string>): string {
  // 键格式与现有 voice_lines.json / assets/audio/voice 一致：无补零的行序号
  const baseKey = `${diaId}_${lineIndex + 1}`
  let assetKey = baseKey
  let suffix = 2
  while (usedAssetKeys.has(assetKey)) {
    assetKey = `${baseKey}_${suffix}`
    suffix++
  }
  usedAssetKeys.add(assetKey)
  return assetKey
}

async function syncVoiceLines(): Promise<void> {
  const voiceLines = await readVoiceLines()
  const existingTextKeys = new Set(voiceLines.map(line => makeTextKey(line.speaker, line.text)))
  const usedAssetKeys = new Set(voiceLines.map(line => line.assetKey))
  let addedCount = 0

  for (const script of Object.values(DIALOGUES)) {
    for (let lineIndex = 0; lineIndex < script.lines.length; lineIndex++) {
      const line = script.lines[lineIndex]!
      if (!voicedSpeakers.has(line.speaker)) continue
      // 静默反应行（纯标点/省略号）不配音
      if (SILENT_TEXT_PATTERN.test(line.text)) continue

      const textKey = makeTextKey(line.speaker, line.text)
      if (existingTextKeys.has(textKey)) continue

      voiceLines.push({
        diaId: script.id,
        speaker: line.speaker,
        text: line.text,
        assetKey: makeAssetKey(script.id, lineIndex, usedAssetKeys),
      })
      existingTextKeys.add(textKey)
      addedCount++
    }
  }

  await writeFile(voiceLinesPath, `${JSON.stringify(voiceLines, null, JSON_FORMAT_SPACE_COUNT)}\n`, UTF8_FILE_ENCODING)
  console.info(`Voice line sync complete: ${addedCount} added, ${voiceLines.length} total`)
}

syncVoiceLines()
  .then(() => {
    process.exitCode = PROCESS_SUCCESS_EXIT_CODE
  })
  .catch((error: unknown) => {
    console.error('Voice line sync failed:', error)
    process.exitCode = PROCESS_FAILURE_EXIT_CODE
  })