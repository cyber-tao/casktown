import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { TEXT_SPEED } from '../utils/constants'
import { DIALOGUES } from '../data/dialogues'
import { QuestSystem } from '../core/QuestSystem'
import type { DialogueLine, DialogueChoice, EventAction } from '../data/types'

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
  白虎: 'npc_white_tiger',
  凤凰: 'npc_phoenix',
  水瑶: 'npc_shuiyao',
  风赤: 'npc_fengchi',
  熙苑: 'npc_xiyuan',
  预言: 'npc_priestess_sun',
  旁白: 'npc_barrel_spirit',
  系统: 'npc_qilin',
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

  constructor() {
    super({ key: 'DialogueOverlay', active: false })
  }

  create(data: { dialogueId: string }): void {
    this.lineIndex = 0
    this.charIndex = 0
    this.isTyping = false
    this.canAdvance = false
    this.inChoice = false
    this.choiceIndex = 0
    this.choices = []

    const script = DIALOGUES[data.dialogueId]
    if (!script) {
      console.warn(`Dialogue ${data.dialogueId} not found`)
      this.closeDialogue()
      return
    }
    this.currentScript = script

    // Darken background
    this.bg = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.3)
    this.bg.setDepth(200)
    this.bg.setScrollFactor(0)

    // Dialogue box
    const box = this.add.rectangle(480, 440, 900, 160, 0x2a2a3e, 0.95)
    box.setStrokeStyle(2, 0x5a5a7e)
    box.setDepth(201)
    box.setScrollFactor(0)

    // Face placeholder
    this.faceRect = this.add.rectangle(110, 440, 120, 120, 0x3a3a4e)
    this.faceRect.setStrokeStyle(2, 0x5a5a7e)
    this.faceRect.setDepth(201)
    this.faceRect.setScrollFactor(0)

    // Face image
    this.faceImage = this.add.image(110, 440, '')
    this.faceImage.setDisplaySize(120, 120)
    this.faceImage.setDepth(202)
    this.faceImage.setScrollFactor(0)
    this.faceImage.setVisible(false)

    // Name
    this.nameText = this.add.text(50, 360, '', {
      fontSize: '18px',
      color: '#f1c40f',
      backgroundColor: '#2a2a3e',
      padding: { x: 8, y: 4 },
    })
    this.nameText.setDepth(202)
    this.nameText.setScrollFactor(0)

    // Text
    this.textObj = this.add.text(180, 380, '', {
      fontSize: '18px',
      color: '#e8e8f0',
      wordWrap: { width: 720 },
      lineSpacing: 6,
    })
    this.textObj.setDepth(202)
    this.textObj.setScrollFactor(0)

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
      this.faceImage.setDisplaySize(120, 120)
    } else {
      this.faceImage.setVisible(false)
    }

    // Play voice line
    const voiceKey = `${this.currentScript.id}_${this.lineIndex}`
    AudioManager.getInstance().playVoice(voiceKey, line.text)

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
    const spacing = 26
    const startY = Math.min(490, 530 - (choices.length - 1) * spacing)

    for (let i = 0; i < choices.length; i++) {
      const text = this.add.text(200, startY + i * spacing, `  ${choices[i]!.text}`, {
        fontSize: '15px',
        color: '#c0c0d0',
        wordWrap: { width: 500 },
      })
      text.setDepth(203)
      text.setScrollFactor(0)
      this.choices.push(text)
    }

    this.cursor = this.add.rectangle(190, startY + 6, 8, 8, 0xf1c40f)
    this.cursor.setDepth(204)
    this.cursor.setScrollFactor(0)
  }

  private moveChoice(dir: number): void {
    if (!this.inChoice || this.choices.length === 0) return
    this.choiceIndex = (this.choiceIndex + dir + this.choices.length) % this.choices.length
    this.cursor.setY(this.choices[this.choiceIndex]!.y + 6)
    AudioManager.getInstance().playSFX('cursor')
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
        const nextScript = DIALOGUES[choice.next]
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
        gd.setFlag(act.flag as string, act.value)
      }
      if (act.type === 'addItem') {
        gd.addItem(act.itemId as string, (act.quantity as number) || 1)
      }
      if (act.type === 'addParty') {
        gd.addPartyMember(act.characterId as string)
      }
      if (act.type === 'questStart') {
        qs.startQuest(act.questId as string)
      }
      if (act.type === 'questAdvance') {
        qs.advanceQuest(act.questId as string, (act.amount as number) || 1)
      }
      if (act.type === 'questComplete') {
        qs.completeQuest(act.questId as string)
      }
      if (act.type === 'adjustTrust') {
        gd.adjustTrust(act.characterId as string, (act.amount as number) || 1)
      }
      if (act.type === 'adjustMercy') {
        gd.adjustMercy((act.amount as number) || 1)
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
