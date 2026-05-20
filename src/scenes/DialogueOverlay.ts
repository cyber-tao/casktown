import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import {
  DIALOGUE_BOX,
  DIALOGUE_CHOICE,
  DIALOGUE_FACE,
  DIALOGUE_NAME_POSITION,
  DIALOGUE_TEXT_POSITION,
  DIALOGUE_TEXT_WIDTH,
  DIALOGUE_TEXT_WRAP_CHARS,
  GAME_HEIGHT,
  GAME_WIDTH,
  TEXT_SPEED,
  scaleFont,
  scalePx,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { queueImageAssets } from '../core/AssetLoader'
import { QuestSystem } from '../core/QuestSystem'
import type { DialogueLine, DialogueChoice, EventAction } from '../data/types'
import voiceLines from '../../voice_lines.json'

export interface DialogueScript {
  id: string
  lines: DialogueLine[]
  onComplete?: EventAction[]
}

const SPEAKER_FACE_MAP: Record<string, string> = {
  T: 't_front_idle_01',
  慧慧: 'huihui_front_idle_01',
  阿博: 'abo_front_idle_01',
  葱葱: 'congcong_front_idle_01',
  sun: 'sun_front_idle_01',
  xiaoai: 'xiaoai_front_idle_01',
  镇长: 'npc_mayor',
  木桶精灵: 'npc_barrel_spirit',
  菠萝大叔: 'npc_uncle_boluo',
  船夫: 'npc_sailor',
  白虎: 'npc_white_tiger',
  凤凰: 'npc_phoenix',
  水瑶: 'npc_shuiyao',
  风赤: 'npc_fengchi',
  熙苑: 'npc_xiyuan',
  预言: 'npc_priestess_sun',
  旁白: 'npc_barrel_spirit',
  系统: 'npc_qilin',
}

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

function wrapDialogueText(text: string): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const char of paragraph) {
      line += char
      if (line.length >= DIALOGUE_TEXT_WRAP_CHARS) {
        lines.push(line)
        line = ''
      }
    }
    if (line.length > 0 || paragraph.length === 0) {
      lines.push(line)
    }
  }
  return lines
}

export class DialogueOverlay extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Rectangle
  private faceRect!: Phaser.GameObjects.Rectangle
  private faceImage!: Phaser.GameObjects.Image
  private nameText!: Phaser.GameObjects.Text
  private textObj!: Phaser.GameObjects.Text
  private choices: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private currentScript!: DialogueScript
  private lineIndex = 0
  private charIndex = 0
  private typeTimer?: Phaser.Time.TimerEvent
  private isTyping = false
  private canAdvance = false
  private choiceIndex = 0
  private inChoice = false
  private dialogueId = ''

  constructor() {
    super({ key: 'DialogueOverlay', active: false })
  }

  init(data: { dialogueId: string }): void {
    this.dialogueId = data.dialogueId
  }

  preload(): void {
    queueImageAssets(this, this.collectDialogueFaceKeys(this.dialogueId))
  }

  private collectDialogueFaceKeys(dialogueId: string, visited: Set<string> = new Set()): Set<string> {
    const keys = new Set<string>()
    if (visited.has(dialogueId)) return keys
    visited.add(dialogueId)
    const script = GAME_CONFIG_DATABASE.getTable('dialogues')[dialogueId]
    if (!script) return keys
    for (const line of script.lines) {
      const faceKey = SPEAKER_FACE_MAP[line.speaker]
      if (faceKey) keys.add(faceKey)
      for (const choice of line.choices ?? []) {
        if (!choice.next) continue
        for (const nestedKey of this.collectDialogueFaceKeys(choice.next, visited)) {
          keys.add(nestedKey)
        }
      }
    }
    return keys
  }

  create(data: { dialogueId: string }): void {
    this.lineIndex = 0
    this.charIndex = 0
    this.isTyping = false
    this.canAdvance = false
    this.inChoice = false
    this.choiceIndex = 0
    this.choices = []

    const dialogues = GAME_CONFIG_DATABASE.getTable('dialogues')
    const script = dialogues[data.dialogueId]
    if (!script) {
      console.warn(`Dialogue ${data.dialogueId} not found`)
      this.closeDialogue()
      return
    }
    this.currentScript = script

    // Darken background
    this.bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.3)
    this.bg.setDepth(200)
    this.bg.setScrollFactor(0)
    this.bg.setInteractive()
    this.bg.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleTouchAdvance())

    // Dialogue box
    const box = this.add.rectangle(DIALOGUE_BOX.x, DIALOGUE_BOX.y, DIALOGUE_BOX.width, DIALOGUE_BOX.height, 0x2a2a3e, 0.95)
    box.setStrokeStyle(scalePx(2), 0x5a5a7e)
    box.setDepth(201)
    box.setScrollFactor(0)
    box.setInteractive()
    box.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleTouchAdvance())

    // Face placeholder
    this.faceRect = this.add.rectangle(DIALOGUE_FACE.x, DIALOGUE_FACE.y, DIALOGUE_FACE.size, DIALOGUE_FACE.size, 0x3a3a4e)
    this.faceRect.setStrokeStyle(scalePx(2), 0x5a5a7e)
    this.faceRect.setDepth(201)
    this.faceRect.setScrollFactor(0)

    // Face image
    this.faceImage = this.add.image(DIALOGUE_FACE.x, DIALOGUE_FACE.y, '')
    this.faceImage.setDisplaySize(DIALOGUE_FACE.size, DIALOGUE_FACE.size)
    this.faceImage.setDepth(202)
    this.faceImage.setScrollFactor(0)
    this.faceImage.setVisible(false)

    // Name
    this.nameText = this.add.text(DIALOGUE_NAME_POSITION.x, DIALOGUE_NAME_POSITION.y, '', {
      fontSize: scaleFont(18),
      color: '#f1c40f',
      backgroundColor: '#2a2a3e',
      padding: { x: scalePx(8), y: scalePx(4) },
    })
    this.nameText.setDepth(202)
    this.nameText.setScrollFactor(0)

    // Text
    this.textObj = this.add.text(DIALOGUE_TEXT_POSITION.x, DIALOGUE_TEXT_POSITION.y, '', {
      fontSize: scaleFont(18),
      color: '#e8e8f0',
      wordWrap: { width: DIALOGUE_TEXT_WIDTH, useAdvancedWrap: true, callback: wrapDialogueText },
      lineSpacing: scalePx(6),
      fixedWidth: DIALOGUE_TEXT_WIDTH,
    })
    this.textObj.setDepth(202)
    this.textObj.setScrollFactor(0)
    this.textObj.setInteractive()
    this.textObj.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleTouchAdvance())

    // Input
    this.input.keyboard?.on('keydown-SPACE', () => this.advance())
    this.input.keyboard?.on('keydown-ENTER', () => this.advance())
    this.input.keyboard?.on('keydown-UP', () => this.moveChoice(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.moveChoice(1))

    // Start first line
    this.showLine()
  }

  private showLine(): void {
    if (this.lineIndex >= this.currentScript.lines.length) {
      this.closeDialogue()
      return
    }

    const line = this.currentScript.lines[this.lineIndex]!
    this.nameText.setText(line.speaker)

    const faceKey = SPEAKER_FACE_MAP[line.speaker]
    if (faceKey && this.textures.exists(faceKey)) {
      this.faceImage.setTexture(faceKey)
      this.faceImage.setVisible(true)
      this.faceImage.setDisplaySize(DIALOGUE_FACE.size, DIALOGUE_FACE.size)
    } else {
      this.faceImage.setVisible(false)
    }

    const voiceKey = this.resolveVoiceKey(line)
    if (voiceKey) {
      AudioManager.getInstance().playVoice(voiceKey, line.text)
    } else {
      AudioManager.getInstance().stopVoice()
    }

    this.charIndex = 0
    this.textObj.setText('')
    this.isTyping = true
    this.canAdvance = false

    // Clear old choices
    for (const c of this.choices) c.destroy()
    this.choices = []
    this.inChoice = false
    if (this.cursor) this.cursor.destroy()

    const speed = this.getTextSpeed()

    if (speed <= 0) {
      this.textObj.setText(line.text)
      this.finishTyping()
    } else {
      this.typeTimer = this.time.addEvent({
        delay: speed,
        callback: () => this.typeChar(line.text),
        repeat: line.text.length - 1,
      })
    }
  }

  private typeChar(fullText: string): void {
    this.charIndex++
    this.textObj.setText(fullText.substring(0, this.charIndex))
    if (this.charIndex % 4 === 0) {
      AudioManager.getInstance().playSFX('dialogue_advance')
    }
    if (this.charIndex >= fullText.length) {
      this.finishTyping()
    }
  }

  private finishTyping(): void {
    this.isTyping = false
    this.canAdvance = true
    const line = this.currentScript.lines[this.lineIndex]!

    if (line.choices && line.choices.length > 0) {
      this.showChoices(line.choices)
    }
  }

  private showChoices(choices: DialogueChoice[]): void {
    this.inChoice = true
    this.choiceIndex = 0
    const boxTop = DIALOGUE_BOX.y - DIALOGUE_BOX.height / 2
    const boxBottom = DIALOGUE_BOX.y + DIALOGUE_BOX.height / 2
    const minY = boxTop + DIALOGUE_BOX.padding
    const maxBottom = boxBottom - DIALOGUE_BOX.padding
    const availableHeight = maxBottom - minY
    let gap: number = DIALOGUE_CHOICE.gap

    for (let i = 0; i < choices.length; i++) {
      const text = this.add.text(DIALOGUE_CHOICE.x, minY, `  ${choices[i]!.text}`, {
        fontSize: `${DIALOGUE_CHOICE.fontSize}px`,
        color: '#c0c0d0',
        wordWrap: { width: DIALOGUE_CHOICE.width, useAdvancedWrap: true },
        fixedWidth: DIALOGUE_CHOICE.width,
      })
      text.setDepth(203)
      text.setScrollFactor(0)
      this.choices.push(text)
    }

    let totalHeight = this.getChoicesHeight(gap)
    if (totalHeight > availableHeight) {
      gap = DIALOGUE_CHOICE.minGap
      totalHeight = this.getChoicesHeight(gap)
    }
    if (totalHeight > availableHeight) {
      const fontSize = Math.max(DIALOGUE_CHOICE.minFontSize, Math.floor(DIALOGUE_CHOICE.fontSize * availableHeight / totalHeight))
      for (const text of this.choices) {
        text.setFontSize(fontSize)
      }
      totalHeight = this.getChoicesHeight(gap)
    }
    let currentY = Math.max(minY, maxBottom - totalHeight)
    for (let i = 0; i < this.choices.length; i++) {
      const text = this.choices[i]!
      text.setY(currentY)
      bindTouchText(text, () => this.selectChoice(i))
      currentY += text.height + gap
    }

    this.cursor = this.add.rectangle(DIALOGUE_CHOICE.cursorX, this.getChoiceCursorY(), DIALOGUE_CHOICE.cursorSize, DIALOGUE_CHOICE.cursorSize, 0xf1c40f)
    this.cursor.setDepth(204)
    this.cursor.setScrollFactor(0)
  }

  private resolveVoiceKey(line: DialogueLine): string | null {
    const occurrence = this.currentScript.lines
      .slice(0, this.lineIndex + 1)
      .filter(item => item.speaker === line.speaker && item.text === line.text)
      .length - 1
    const mapKey = `${this.currentScript.id}\n${line.speaker}\n${line.text}`
    const keys = VOICE_LINE_KEYS[mapKey]
    if (keys) return keys[occurrence] ?? keys[0] ?? null
    const textKeys = VOICE_LINE_TEXT_KEYS[`${line.speaker}\n${line.text}`]
    return textKeys?.[occurrence] ?? textKeys?.[0] ?? null
  }

  private getChoicesHeight(gap: number): number {
    return this.choices.reduce((sum, text) => sum + text.height, 0) + gap * Math.max(0, this.choices.length - 1)
  }

  private getChoiceCursorY(): number {
    const choice = this.choices[this.choiceIndex]
    if (!choice) return DIALOGUE_BOX.y
    return choice.y + Math.min(choice.height, DIALOGUE_CHOICE.fontSize) / 2
  }

  private moveChoice(dir: number): void {
    if (!this.inChoice || this.choices.length === 0) return
    this.choiceIndex = (this.choiceIndex + dir + this.choices.length) % this.choices.length
    this.cursor.setY(this.getChoiceCursorY())
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectChoice(index: number): void {
    if (!this.inChoice || index >= this.choices.length) return
    this.choiceIndex = index
    this.cursor.setY(this.getChoiceCursorY())
    this.advance()
  }

  private handleTouchAdvance(): void {
    if (this.inChoice && !this.isTyping) return
    this.advance()
  }

  private advance(): void {
    if (this.isTyping) {
      // Skip to end
      this.typeTimer?.remove()
      const line = this.currentScript.lines[this.lineIndex]!
      this.textObj.setText(line.text)
      this.finishTyping()
      AudioManager.getInstance().playSFX('confirm')
      return
    }

    if (!this.canAdvance) return

    const line = this.currentScript.lines[this.lineIndex]!

    if (this.inChoice && line.choices) {
      AudioManager.getInstance().playSFX('confirm')
      const choice = line.choices[this.choiceIndex]!
      this.applyChoiceActions(choice.actions)
      if (choice.next) {
        const nextScript = GAME_CONFIG_DATABASE.getTable('dialogues')[choice.next]
        if (nextScript) {
          this.currentScript = nextScript
          this.lineIndex = 0
          this.showLine()
          return
        }
      }
      this.lineIndex++
      this.showLine()
      return
    }

    AudioManager.getInstance().playSFX('confirm')
    this.lineIndex++
    this.showLine()
  }

  private applyChoiceActions(actions?: EventAction[]): void {
    if (!actions) return
    const gd = GameData.getInstance()
    const qs = QuestSystem.getInstance()
    for (const act of actions) {
      if (act.type === 'setFlag') {
        gd.setFlag(act.flag, act.value)
      }
      if (act.type === 'setBranch') {
        gd.updateBranch(act.branch, act.value)
      }
      if (act.type === 'addItem') {
        gd.addItem(act.itemId, act.quantity || 1)
      }
      if (act.type === 'addParty') {
        gd.addPartyMember(act.characterId)
      }
      if (act.type === 'questStart') {
        qs.startQuest(act.questId)
      }
      if (act.type === 'questAdvance') {
        qs.advanceQuest(act.questId, act.amount || 1)
      }
      if (act.type === 'questComplete') {
        qs.completeQuest(act.questId)
      }
      if (act.type === 'adjustTrust') {
        gd.adjustTrust(act.characterId, act.amount || 1)
      }
      if (act.type === 'adjustMercy') {
        gd.adjustMercy(act.amount || 1)
      }
    }
  }

  private getTextSpeed(): number {
    const gd = GameData.getInstance()
    const mode = gd.settings.textSpeed
    return TEXT_SPEED[mode as keyof typeof TEXT_SPEED] ?? TEXT_SPEED.normal
  }

  private closeDialogue(): void {
    this.typeTimer?.remove()
    const actions = this.currentScript?.onComplete
    if (actions && actions.length > 0) {
      EventBus.emit(GameEvents.DIALOGUE_END, { actions })
    } else {
      EventBus.emit(GameEvents.DIALOGUE_END)
    }
    this.scene.stop()
  }
}
