import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve, join } from 'path';
import { VOICE_MAP } from './voice-config';
import {
  DEFAULT_VOICE_PITCH,
  DEFAULT_VOICE_SPEED,
  AUDIO_CONVERSION_CLI,
  AUDIO_CONVERSION_CODEC,
  AUDIO_CONVERSION_QUALITY,
  AUDIO_CONVERSION_STRICT_MODE,
  AUDIO_OUTPUT_CHANNEL_COUNT,
  COMMAND_LOOKUP_CLI,
  PROCESS_ERROR_MESSAGE_MAX_LENGTH,
  PROCESS_FAILURE_EXIT_CODE,
  VOICE_AUDIO_OUTPUT_DIR,
  VOICE_CHANNEL_COUNT,
  VOICE_CONVERSION_TIMEOUT_MS,
  VOICE_GENERATION_DELAY_MS,
  VOICE_GENERATION_RETRY_LIMIT,
  VOICE_GENERATION_LIMIT_ENV,
  VOICE_LINES_FILE,
  VOICE_RATE_LIMIT_RETRY_DELAY_MS,
  VOICE_SAMPLE_RATE,
  VOICE_SYNTHESIS_TIMEOUT_MS,
  VOICE_TEMP_DIR,
  VOICE_SYNTHESIS_CLI,
} from './constants';

interface VoiceLine {
  diaId: string;
  speaker: string;
  text: string;
  assetKey: string;
}

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const VOICE_LINES_PATH = join(PROJECT_ROOT, VOICE_LINES_FILE);
const OUTPUT_DIR = join(PROJECT_ROOT, VOICE_AUDIO_OUTPUT_DIR);
const TMP_DIR = join(PROJECT_ROOT, VOICE_TEMP_DIR);

function commandExists(command: string): boolean {
  try {
    execFileSync(COMMAND_LOOKUP_CLI, [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function formatProcessError(error: any): string {
  const stderr = error.stderr?.toString() || '';
  const stdout = error.stdout?.toString() || '';
  const message = error.message?.toString() || '';
  const output = stderr || stdout || message || 'unknown';
  const normalizedOutput = output
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .join('\n');
  return normalizedOutput.slice(-PROCESS_ERROR_MESSAGE_MAX_LENGTH);
}

function getGenerationLimit(): number | null {
  const value = process.env[VOICE_GENERATION_LIMIT_ENV];
  if (!value) return null;
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : null;
}

function hasGeneratedVoiceFile(filePath: string): boolean {
  return existsSync(filePath) && statSync(filePath).size > 0;
}

function generateOne(line: VoiceLine): { key: string; ok: boolean; err?: string } {
  const config = VOICE_MAP[line.speaker];
  if (!config) {
    return { key: line.assetKey, ok: false, err: `unknown speaker: ${line.speaker}` };
  }

  const tmpWav = join(TMP_DIR, `${line.assetKey}.wav`);
  const tmpTxt = join(TMP_DIR, `${line.assetKey}.txt`);
  const finalOgg = join(OUTPUT_DIR, `${line.assetKey}.ogg`);

  if (hasGeneratedVoiceFile(finalOgg)) {
    return { key: line.assetKey, ok: true };
  }

  try {
    writeFileSync(tmpTxt, line.text, 'utf-8');

    const args: string[] = [
      'speech', 'synthesize',
      '--text-file', tmpTxt,
      '--voice', config.voiceId,
      '--language', 'zh',
      '--model', 'speech-2.8-hd',
      '--format', 'wav',
      '--sample-rate', String(VOICE_SAMPLE_RATE),
      '--channels', String(VOICE_CHANNEL_COUNT),
      '--out', tmpWav,
      '--quiet',
    ];
    if (config.speed !== DEFAULT_VOICE_SPEED) args.push('--speed', String(config.speed));
    if (config.pitch !== DEFAULT_VOICE_PITCH) args.push('--pitch', String(config.pitch));

    execFileSync(VOICE_SYNTHESIS_CLI, args, { timeout: VOICE_SYNTHESIS_TIMEOUT_MS, stdio: 'pipe' });

    execFileSync(AUDIO_CONVERSION_CLI, [
      '-y',
      '-i',
      tmpWav,
      '-strict',
      AUDIO_CONVERSION_STRICT_MODE,
      '-ac',
      String(AUDIO_OUTPUT_CHANNEL_COUNT),
      '-c:a',
      AUDIO_CONVERSION_CODEC,
      '-q:a',
      AUDIO_CONVERSION_QUALITY,
      finalOgg,
    ], {
      timeout: VOICE_CONVERSION_TIMEOUT_MS,
      stdio: 'pipe',
    });

    return { key: line.assetKey, ok: true };
  } catch (err: any) {
    try { unlinkSync(finalOgg); } catch {}
    return { key: line.assetKey, ok: false, err: formatProcessError(err) };
  } finally {
    try { unlinkSync(tmpTxt); } catch {}
    try { unlinkSync(tmpWav); } catch {}
  }
}

function main() {
  const lines: VoiceLine[] = JSON.parse(readFileSync(VOICE_LINES_PATH, 'utf-8'));

  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const unknownSpeakers = new Set<string>();
  for (const line of lines) {
    if (!VOICE_MAP[line.speaker]) unknownSpeakers.add(line.speaker);
  }
  if (unknownSpeakers.size > 0) {
    console.error(`Unknown speakers: ${[...unknownSpeakers].join(', ')}`);
    process.exit(PROCESS_FAILURE_EXIT_CODE);
  }

  const generationLimit = getGenerationLimit();
  const missingLines = lines
    .filter(line => !hasGeneratedVoiceFile(join(OUTPUT_DIR, `${line.assetKey}.ogg`)))
    .slice(0, generationLimit ?? lines.length);
  console.log(`Generating ${missingLines.length} missing voice lines from ${lines.length} configured lines...`);
  if (missingLines.length > 0 && !commandExists(VOICE_SYNTHESIS_CLI)) {
    console.error(`Voice synthesis CLI not found: ${VOICE_SYNTHESIS_CLI}`);
    process.exit(PROCESS_FAILURE_EXIT_CODE);
  }
  if (missingLines.length > 0 && !commandExists(AUDIO_CONVERSION_CLI)) {
    console.error(`Audio conversion CLI not found: ${AUDIO_CONVERSION_CLI}`);
    process.exit(PROCESS_FAILURE_EXIT_CODE);
  }

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < missingLines.length; i++) {
    let r = generateOne(missingLines[i]);
    let retries = 0;
    while (!r.ok && retries < VOICE_GENERATION_RETRY_LIMIT && r.err?.includes('rate limit')) {
      retries++;
      console.log(`  [${i + 1}/${missingLines.length}] RETRY ${retries}: ${r.key}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, VOICE_RATE_LIMIT_RETRY_DELAY_MS);
      r = generateOne(missingLines[i]);
    }
    if (r.ok) {
      ok++;
      console.log(`  [${i + 1}/${missingLines.length}] OK: ${r.key} (${missingLines[i].speaker})`);
    } else {
      fail++;
      console.error(`  [${i + 1}/${missingLines.length}] FAIL: ${r.key} - ${r.err}`);
    }
    if (i < missingLines.length - 1) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, VOICE_GENERATION_DELAY_MS);
    }
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`\nDone! OK: ${ok}, Failed: ${fail}`);
}

main();
