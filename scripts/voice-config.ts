import {
  DEFAULT_VOICE_PITCH,
  DEFAULT_VOICE_SPEED,
} from './constants'

export interface VoiceConfig {
  voiceId: string
  speed: number
  pitch: number
}

export const VOICE_MAP: Record<string, VoiceConfig> = {
  T: { voiceId: 'Chinese (Mandarin)_Unrestrained_Young_Man', speed: DEFAULT_VOICE_SPEED, pitch: DEFAULT_VOICE_PITCH },
  慧慧: { voiceId: 'Chinese (Mandarin)_Crisp_Girl', speed: 1.05, pitch: DEFAULT_VOICE_PITCH },
  阿博: { voiceId: 'male-qn-jingying-jingpin', speed: 0.9, pitch: -1 },
  葱葱: { voiceId: 'badao_shaoye', speed: 1.1, pitch: 1 },
  sun: { voiceId: 'danya_xuejie', speed: 0.9, pitch: DEFAULT_VOICE_PITCH },
  xiaoai: { voiceId: 'wumei_yujie', speed: 0.85, pitch: -1 },
  镇长: { voiceId: 'Chinese (Mandarin)_Gentleman', speed: 0.85, pitch: -2 },
  木桶精灵: { voiceId: 'Chinese (Mandarin)_Cute_Spirit', speed: 1.1, pitch: 1 },
  菠萝大叔: { voiceId: 'Chinese (Mandarin)_Humorous_Elder', speed: 0.9, pitch: -1 },
  船夫: { voiceId: 'Chinese (Mandarin)_Sincere_Adult', speed: DEFAULT_VOICE_SPEED, pitch: -1 },
  白虎: { voiceId: 'male-qn-badao-jingpin', speed: 0.85, pitch: -2 },
  熙苑: { voiceId: 'Chinese (Mandarin)_Wise_Women', speed: 0.9, pitch: DEFAULT_VOICE_PITCH },
  水瑶: { voiceId: 'Chinese (Mandarin)_Mature_Woman', speed: 0.95, pitch: DEFAULT_VOICE_PITCH },
  风赤: { voiceId: 'Chinese (Mandarin)_Stubborn_Friend', speed: 1.05, pitch: DEFAULT_VOICE_PITCH },
  凤凰: { voiceId: 'Chinese (Mandarin)_News_Anchor', speed: 0.9, pitch: DEFAULT_VOICE_PITCH },
  无相: { voiceId: 'lengdan_xiongzhang', speed: 0.85, pitch: -1 },
}
