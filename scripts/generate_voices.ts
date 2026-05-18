import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync, unlinkSync } from 'fs';
import { execFileSync, execSync } from 'child_process';
import { resolve, join } from 'path';

const DELAY_MS = 1200;
const MAX_RETRY = 2;

interface VoiceLine {
  diaId: string;
  speaker: string;
  text: string;
  assetKey: string;
}

interface VoiceConfig {
  voiceId: string;
  speed: number;
  pitch: number;
}

const VOICE_MAP: Record<string, VoiceConfig> = {
  'T': { voiceId: 'Chinese (Mandarin)_Unrestrained_Young_Man', speed: 1.0, pitch: 0 },
  '慧慧': { voiceId: 'Chinese (Mandarin)_Crisp_Girl', speed: 1.05, pitch: 0 },
  '阿博': { voiceId: 'male-qn-jingying-jingpin', speed: 0.9, pitch: -1 },
  '葱葱': { voiceId: 'badao_shaoye', speed: 1.1, pitch: 1 },
  'sun': { voiceId: 'danya_xuejie', speed: 0.9, pitch: 0 },
  'xiaoai': { voiceId: 'wumei_yujie', speed: 0.85, pitch: -1 },
  '镇长': { voiceId: 'Chinese (Mandarin)_Gentleman', speed: 0.85, pitch: -2 },
  '木桶精灵': { voiceId: 'Chinese (Mandarin)_Cute_Spirit', speed: 1.1, pitch: 1 },
  '菠萝大叔': { voiceId: 'Chinese (Mandarin)_Humorous_Elder', speed: 0.9, pitch: -1 },
  '船夫': { voiceId: 'Chinese (Mandarin)_Sincere_Adult', speed: 1.0, pitch: -1 },
  '白虎': { voiceId: 'male-qn-badao-jingpin', speed: 0.85, pitch: -2 },
  '熙苑': { voiceId: 'Chinese (Mandarin)_Wise_Women', speed: 0.9, pitch: 0 },
  '水瑶': { voiceId: 'Chinese (Mandarin)_Mature_Woman', speed: 0.95, pitch: 0 },
  '风赤': { voiceId: 'Chinese (Mandarin)_Stubborn_Friend', speed: 1.05, pitch: 0 },
  '凤凰': { voiceId: 'Chinese (Mandarin)_News_Anchor', speed: 0.9, pitch: 0 },
  '无相': { voiceId: 'lengdan_xiongzhang', speed: 0.85, pitch: -1 },
};

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const VOICE_LINES_PATH = join(PROJECT_ROOT, 'voice_lines.json');
const OUTPUT_DIR = join(PROJECT_ROOT, 'assets', 'audio', 'voice');
const TMP_DIR = join(PROJECT_ROOT, '.voice-tmp');

function generateOne(line: VoiceLine): { key: string; ok: boolean; err?: string } {
  const config = VOICE_MAP[line.speaker];
  if (!config) {
    return { key: line.assetKey, ok: false, err: `unknown speaker: ${line.speaker}` };
  }

  const tmpWav = join(TMP_DIR, `${line.assetKey}.wav`);
  const tmpTxt = join(TMP_DIR, `${line.assetKey}.txt`);
  const finalOgg = join(OUTPUT_DIR, `${line.assetKey}.ogg`);

  if (existsSync(finalOgg)) {
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
      '--sample-rate', '32000',
      '--channels', '1',
      '--out', tmpWav,
      '--quiet',
    ];
    if (config.speed !== 1.0) args.push('--speed', String(config.speed));
    if (config.pitch !== 0) args.push('--pitch', String(config.pitch));

    execFileSync('mmx', args, { timeout: 30000, stdio: 'pipe' });

    execSync(`ffmpeg -y -i "${tmpWav}" -c:a libvorbis -q:a 4 "${finalOgg}"`, {
      timeout: 10000,
      stdio: 'pipe',
    });

    return { key: line.assetKey, ok: true };
  } catch (err: any) {
    const stderr = err.stderr?.toString() || '';
    const msg = stderr.slice(0, 150) || err.message?.slice(0, 150) || 'unknown';
    return { key: line.assetKey, ok: false, err: msg };
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
    process.exit(1);
  }

  console.log(`Generating ${lines.length} voice lines...`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < lines.length; i++) {
    let r = generateOne(lines[i]);
    let retries = 0;
    while (!r.ok && retries < MAX_RETRY && r.err?.includes('rate limit')) {
      retries++;
      console.log(`  [${i + 1}/${lines.length}] RETRY ${retries}: ${r.key}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
      r = generateOne(lines[i]);
    }
    if (r.ok) {
      ok++;
      console.log(`  [${i + 1}/${lines.length}] OK: ${r.key} (${lines[i].speaker})`);
    } else {
      fail++;
      console.error(`  [${i + 1}/${lines.length}] FAIL: ${r.key} - ${r.err}`);
    }
    if (i < lines.length - 1) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, DELAY_MS);
    }
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`\nDone! OK: ${ok}, Failed: ${fail}`);
}

main();
