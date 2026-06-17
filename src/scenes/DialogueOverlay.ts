import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import {
  DIALOGUE_BOX,
  DIALOGUE_CHOICE,
  DIALOGUE_FACE,
  DIALOGUE_NAME_POSITION,
  DIALOGUE_TEXT_FACELESS_POSITION,
  DIALOGUE_TEXT_FACELESS_WIDTH,
  DIALOGUE_TEXT_POSITION,
  DIALOGUE_UI,
  DIALOGUE_TEXT_WIDTH,
  DIALOGUE_TEXT_WRAP_CHARS,
  DEFAULT_EVENT_ACTION_AMOUNT,
  DEFAULT_ITEM_QUANTITY,
  GAME_HEIGHT,
  GAME_WIDTH,
  LOADING_SCREEN,
  RUNTIME_UI_ASSET_KEYS,
  TEXT_SPEED,
  scaleFont,
  scalePx,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { queueImageAssets } from '../core/AssetLoader'
import { DialogueCompletionQueue } from '../core/DialogueCompletionQueue'
import { QuestSystem } from '../core/QuestSystem'
import { SkillGrowth } from '../core/SkillGrowth'
import { areEventConditionsMet } from '../core/EventConditions'
import { showLoadingScreen } from '../utils/loadingScreen'
import type { DialogueChoice, DialogueData, EventAction } from '../data/types'
import { resolveDialogueVoiceKey } from '../utils/voiceLines'

interface DialogueContinuation {
  script: DialogueData
  lineIndex: number
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
}

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
  private faceRect!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private faceImage!: Phaser.GameObjects.Image
  private nameText!: Phaser.GameObjects.Text
  private textObj!: Phaser.GameObjects.Text
  private choices: Phaser.GameObjects.Text[] = []
  private visibleChoices: DialogueChoice[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private currentScript!: DialogueData
  private lineIndex = 0
  private charIndex = 0
  private typeTimer?: Phaser.Time.TimerEvent
  private isTyping = false
  private canAdvance = false
  private choiceIndex = 0
  private inChoice = false
  private dialogueId = ''
  private continuations: DialogueContinuation[] = []
  private completionQueue = new DialogueCompletionQueue()

  constructor() {
    super({ key: 'DialogueOverlay', active: false })
  }

  init(data: { dialogueId: string }): void {
    this.dialogueId = data.dialogueId
  }

  preload(): void {
    showLoadingScreen(this, LOADING_SCREEN.DIALOGUE_LABEL)
    queueImageAssets(this, [...this.collectDialogueFaceKeys(this.dialogueId), ...Object.values(RUNTIME_UI_ASSET_KEYS)])
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

  private addRuntimePanel(x: number, y: number, width: number, height: number, textureKey: string, fallbackColor: number, fallbackAlpha: number, depth: number): Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image {
    if (this.textures.exists(textureKey)) {
      const panel = this.add.image(x, y, textureKey)
      panel.setDisplaySize(width, height)
      panel.setAlpha(fallbackAlpha)
      panel.setDepth(depth)
      panel.setScrollFactor(0)
      return panel
    }

    const panel = this.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
    panel.setStrokeStyle(DIALOGUE_UI.STROKE_WIDTH, DIALOGUE_UI.BORDER_COLOR)
    panel.setDepth(depth)
    panel.setScrollFactor(0)
    return panel
  }

  create(data: { dialogueId: string }): void {
    this.lineIndex = 0
    this.charIndex = 0
    this.isTyping = false
    this.canAdvance = false
    this.inChoice = false
    this.choiceIndex = 0
    this.choices = []
    this.visibleChoices = []
    this.continuations = []
    this.completionQueue = new DialogueCompletionQueue()

    const dialogues = GAME_CONFIG_DATABASE.getTable('dialogues')
    const script = dialogues[data.dialogueId]
    if (!script) {
      console.warn(`Dialogue ${data.dialogueId} not found`)
      this.closeMissingDialogue()
      return
    }
    this.currentScript = script

    // Darken background
    this.bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, DIALOGUE_UI.BACKDROP_ALPHA)
    this.bg.setDepth(200)
    this.bg.setScrollFactor(0)
    this.bg.setInteractive()
    this.bg.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleTouchAdvance())

    // Dialogue box
    const box = this.addRuntimePanel(DIALOGUE_BOX.x, DIALOGUE_BOX.y, DIALOGUE_BOX.width, DIALOGUE_BOX.height, RUNTIME_UI_ASSET_KEYS.DIALOGUE_PANEL, DIALOGUE_UI.BOX_COLOR, DIALOGUE_UI.BOX_ALPHA, 201)
    box.setInteractive()
    box.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleTouchAdvance())

    // Face placeholder
    this.faceRect = this.addRuntimePanel(DIALOGUE_FACE.x, DIALOGUE_FACE.y, DIALOGUE_FACE.size, DIALOGUE_FACE.size, RUNTIME_UI_ASSET_KEYS.DIALOGUE_FACE, DIALOGUE_UI.FACE_COLOR, DIALOGUE_UI.BOX_ALPHA, 201)

    // Face image
    this.faceImage = this.add.image(DIALOGUE_FACE.x, DIALOGUE_FACE.y, '')
    this.faceImage.setDisplaySize(DIALOGUE_FACE.size, DIALOGUE_FACE.size)
    this.faceImage.setDepth(202)
    this.faceImage.setScrollFactor(0)
    this.faceImage.setVisible(false)

    // Name
    this.nameText = this.add.text(DIALOGUE_NAME_POSITION.x, DIALOGUE_NAME_POSITION.y, '', {
      fontSize: scaleFont(18),
      color: DIALOGUE_UI.NAME_COLOR,
      backgroundColor: DIALOGUE_UI.NAME_BACKGROUND_COLOR,
      padding: { x: scalePx(8), y: scalePx(4) },
    })
    this.nameText.setDepth(202)
    this.nameText.setScrollFactor(0)

    // Text
    this.textObj = this.add.text(DIALOGUE_TEXT_POSITION.x, DIALOGUE_TEXT_POSITION.y, '', {
      fontSize: scaleFont(18),
      color: DIALOGUE_UI.TEXT_COLOR,
      wordWrap: { width: DIALOGUE_TEXT_WIDTH, useAdvancedWrap: true, callback: wrapDialogueText },
      lineSpacing: scalePx(6),
      fixedWidth: DIALOGUE_TEXT_WIDTH,
    })
    this.textObj.setDepth(202)
    this.textObj.setScrollFactor(0)
    this.textObj.setInteractive()
    this.textObj.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleTouchAdvance())

    cleanupKeyboardOnShutdown(this)
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
    const hasFace = Boolean(faceKey && this.textures.exists(faceKey))
    this.faceRect.setVisible(hasFace)
    this.textObj.setX(hasFace ? DIALOGUE_TEXT_POSITION.x : DIALOGUE_TEXT_FACELESS_POSITION.x)
    this.textObj.setWordWrapWidth(hasFace ? DIALOGUE_TEXT_WIDTH : DIALOGUE_TEXT_FACELESS_WIDTH, true)
    this.textObj.setFixedSize(hasFace ? DIALOGUE_TEXT_WIDTH : DIALOGUE_TEXT_FACELESS_WIDTH, 0)

    if (hasFace && faceKey) {
      this.faceImage.setTexture(faceKey)
      this.faceImage.setVisible(true)
      this.faceImage.setDisplaySize(DIALOGUE_FACE.size, DIALOGUE_FACE.size)
    } else {
      this.faceImage.setVisible(false)
    }

    const voiceKey = this.resolveVoiceKey()
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
    this.visibleChoices = []
    this.inChoice = false
    if (this.cursor) this.cursor.destroy()

    const speed = this.getTextSpeed()

    if (line.text.length === 0 || speed <= 0) {
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

    const choices = this.getVisibleChoices(line.choices)
    if (choices.length > 0) {
      this.showChoices(choices)
    }
  }

  private getVisibleChoices(choices: DialogueChoice[] | undefined): DialogueChoice[] {
    if (!choices) return []
    const gd = GameData.getInstance()
    return choices.filter(choice => areEventConditionsMet(choice.condition ? [choice.condition] : undefined, flag => gd.getFlag(flag)))
  }

  private showChoices(choices: DialogueChoice[]): void {
    if (choices.length === 0) return
    this.visibleChoices = choices
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
        color: DIALOGUE_UI.CHOICE_COLOR,
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

    this.cursor = this.add.rectangle(DIALOGUE_CHOICE.cursorX, this.getChoiceCursorY(), DIALOGUE_CHOICE.cursorSize, DIALOGUE_CHOICE.cursorSize, DIALOGUE_CHOICE.cursorColor)
    this.cursor.setDepth(204)
    this.cursor.setScrollFactor(0)
  }

  private resolveVoiceKey(): string | null {
    return resolveDialogueVoiceKey(this.currentScript.id, this.currentScript.lines, this.lineIndex)
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
    if (!this.inChoice || index >= this.visibleChoices.length) return
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

    if (this.inChoice) {
      AudioManager.getInstance().playSFX('confirm')
      const choice = this.visibleChoices[this.choiceIndex]
      if (!choice) return
      this.applyChoiceActions(choice.actions)
      if (choice.next) {
        const nextScript = GAME_CONFIG_DATABASE.getTable('dialogues')[choice.next]
        if (nextScript) {
          if (this.lineIndex < this.currentScript.lines.length - 1) {
            this.continuations.push({ script: this.currentScript, lineIndex: this.lineIndex + 1 })
          } else {
            this.completionQueue.deferTerminalParent(this.currentScript)
          }
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
        SkillGrowth.getInstance().checkAllUnlocks()
      }
      if (act.type === 'setBranch') {
        gd.updateBranch(act.branch, act.value)
        SkillGrowth.getInstance().checkAllUnlocks()
      }
      if (act.type === 'addItem') {
        gd.addItem(act.itemId, act.quantity ?? DEFAULT_ITEM_QUANTITY)
      }
      if (act.type === 'removeItem') {
        gd.removeItem(act.itemId, act.quantity ?? DEFAULT_ITEM_QUANTITY)
      }
      if (act.type === 'addParty') {
        gd.addPartyMember(act.characterId)
        SkillGrowth.getInstance().checkAllUnlocks()
      }
      if (act.type === 'removeParty') {
        gd.removePartyMember(act.characterId)
      }
      if (act.type === 'questStart') {
        qs.startQuest(act.questId)
      }
      if (act.type === 'questAdvance') {
        qs.advanceQuest(act.questId, act.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
      }
      if (act.type === 'questComplete') {
        qs.completeQuest(act.questId)
        SkillGrowth.getInstance().checkAllUnlocks()
      }
      if (act.type === 'adjustTrust') {
        gd.adjustTrust(act.characterId, act.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
      }
      if (act.type === 'adjustMercy') {
        gd.adjustMercy(act.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
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
    this.completionQueue.completeScript(this.currentScript)
    const continuation = this.continuations.pop()
    if (continuation) {
      this.currentScript = continuation.script
      this.lineIndex = continuation.lineIndex
      this.showLine()
      return
    }
    const actions = this.completionQueue.finalize()
    this.scene.stop()
    if (actions && actions.length > 0) {
      EventBus.emit(GameEvents.DIALOGUE_END, { actions })
    } else {
      EventBus.emit(GameEvents.DIALOGUE_END)
    }
  }

  private closeMissingDialogue(): void {
    this.typeTimer?.remove()
    this.scene.stop()
    EventBus.emit(GameEvents.DIALOGUE_END)
  }
}
