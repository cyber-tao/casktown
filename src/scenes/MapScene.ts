import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { EventBus, GameEvents } from '../core/EventBus'
import { QuestSystem } from '../core/QuestSystem'
import { RebuildSystem } from '../core/RebuildSystem'
import { AudioManager } from '../core/AudioManager'
import { InputManager } from '../core/InputManager'
import { SaveManager } from '../core/SaveManager'
import { getMap } from '../data/maps'
import { ENCOUNTERS } from '../data/encounters'
import { TILE_SPRITES } from '../data/tileSprites'
import {
  DEFAULT_ENEMY_SPRITE_KEY,
  FOLLOWER_MIN_DISTANCE_FACTOR,
  MAP_MOVE_SPEED_TILES_PER_SECOND,
  TILE_SIZE,
  GAME_WIDTH,
  GAME_HEIGHT,
  DIRECTION_VECTORS,
} from '../utils/constants'
import type { MapData, MapEvent, EventAction } from '../data/types'

export class MapScene extends Phaser.Scene {
  private mapData!: MapData
  private player!: Phaser.GameObjects.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private actionKeys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private isMoving = false
  private moveStart = { x: 0, y: 0 }
  private moveTarget = { x: 0, y: 0 }
  private moveElapsed = 0
  private moveDuration = 0
  private moveSpeed = MAP_MOVE_SPEED_TILES_PER_SECOND
  private currentDir = 2 // down
  private tileSprites: Phaser.GameObjects.Image[][] = []
  private npcs: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private eventObjects: Phaser.GameObjects.Rectangle[] = []
  private collisionGrid: boolean[][] = []
  private inEvent = false
  private uiTexts: Phaser.GameObjects.Text[] = []
  private mapNameText!: Phaser.GameObjects.Text

  private followers: Phaser.GameObjects.Sprite[] = []
  private followerPositions: { x: number; y: number }[] = []
  private gpConfirmPrev = false
  private gpCancelPrev = false
  private gpMenuPrev = false
  private battleEnemies: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private enemyPatrolTimers: Phaser.Time.TimerEvent[] = []
  private pendingActions: EventAction[] = []
  private pendingMapEventId = ''

  constructor() {
    super({ key: 'MapScene' })
  }

  private handleQuickSave = (): void => {
    SaveManager.getInstance().quickSave()
  }

  private handleQuickLoad = (): void => {
    if (SaveManager.getInstance().quickLoad()) {
      this.scene.restart({ mapId: GameData.getInstance().currentMap })
    }
  }

  init(data: { mapId?: string }): void {
    const mapId = data.mapId || GameData.getInstance().currentMap
    this.mapData = getMap(mapId)
    GameData.getInstance().currentMap = this.mapData.id
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)
    this.inEvent = false
    this.isMoving = false
    this.tileSprites = []
    this.npcs = new Map()
    this.eventObjects = []
    this.uiTexts = []
    this.battleEnemies = new Map()
    this.enemyPatrolTimers = []
    this.pendingActions = []
    this.pendingMapEventId = ''

    this.cameras.main.setBackgroundColor('#2d4a22')
    this.cameras.main.setBounds(0, 0, this.mapData.width * TILE_SIZE, this.mapData.height * TILE_SIZE)

    this.buildCollisionGrid()
    this.renderMap()
    this.spawnPlayer()
    this.spawnNPCs()
    this.createEvents()
    this.setupInput()
    this.createUI()

    // Show map name
    this.showMapName()
    this.createWeather()
    this.startNPCMovement()

    // Play area BGM
    AudioManager.getInstance().setScene(this)
    AudioManager.getInstance().playBGMForMap(this.mapData.id)

    // Listen for dialogue end
    EventBus.on(GameEvents.DIALOGUE_END, this.onDialogueEnd, this)
    EventBus.on(GameEvents.BATTLE_END, this.onBattleEnd, this)
    EventBus.on(GameEvents.MENU_CLOSE, this.onMenuClose, this)
    window.addEventListener('game-quicksave', this.handleQuickSave)
    window.addEventListener('game-quickload', this.handleQuickLoad)

    // Autorun events
    this.checkAutorunEvents()
  }

  override update(time: number, delta: number): void {
    if (this.inEvent) return

    this.pollGamepadButtons()

    if (this.isMoving) {
      this.updateMovement(delta)
    } else {
      this.handleInput()
    }
  }

  private buildCollisionGrid(): void {
    for (let y = 0; y < this.mapData.height; y++) {
      this.collisionGrid[y] = []
      for (let x = 0; x < this.mapData.width; x++) {
        this.collisionGrid[y]![x] = false
      }
    }
    for (const idx of this.mapData.collisions) {
      const x = idx % this.mapData.width
      const y = Math.floor(idx / this.mapData.width)
      if (y >= 0 && y < this.mapData.height && x >= 0 && x < this.mapData.width) {
        this.collisionGrid[y]![x] = true
      }
    }
  }

  private renderMap(): void {
    const gd = GameData.getInstance()
    const resolveTile = (idx: number): number => {
      if (idx === 14 && gd.rebuildLevel >= 2) return 9 // RUIN -> HOUSE
      if (idx === 13 && gd.rebuildLevel >= 1) return 22 // STUMP -> SAPLING
      return idx
    }

    // Ground layer - drawn as a single render texture to eliminate tile gaps
    const groundRT = this.add.renderTexture(0, 0, this.mapData.width * TILE_SIZE, this.mapData.height * TILE_SIZE)
    groundRT.setOrigin(0, 0)
    groundRT.setDepth(0)

    const ground = this.mapData.layers[0]!
    for (let y = 0; y < this.mapData.height; y++) {
      this.tileSprites[y] = []
      for (let x = 0; x < this.mapData.width; x++) {
        const idx = resolveTile(ground.data[y * this.mapData.width + x] ?? 0)
        const spriteKey = TILE_SPRITES[idx] || 'env_dirt_plain'
        const temp = this.add.image(0, 0, spriteKey)
        temp.setOrigin(0, 0)
        temp.setDisplaySize(TILE_SIZE, TILE_SIZE)
        groundRT.draw(temp, x * TILE_SIZE, y * TILE_SIZE)
        temp.destroy()
        this.tileSprites[y]![x] = null as unknown as Phaser.GameObjects.Image
      }
    }

    // Object layer
    const objects = this.mapData.layers[1]!
    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        const raw = objects.data[y * this.mapData.width + x]
        if (raw && raw > 0) {
          const idx = resolveTile(raw)
          const spriteKey = TILE_SPRITES[idx]
          if (spriteKey) {
            const img = this.add.image(x * TILE_SIZE, y * TILE_SIZE, spriteKey)
            img.setOrigin(0, 0)
            img.setDisplaySize(TILE_SIZE, TILE_SIZE)
            img.setDepth(1)
          }
        }
      }
    }
  }

  private spawnPlayer(): void {
    const gd = GameData.getInstance()
    const px = gd.playerPosition.x
    const py = gd.playerPosition.y
    const leader = gd.party[0] || 'T'
    const spriteKey = `${leader.toLowerCase()}_front_idle_01`

    this.player = this.add.sprite(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, spriteKey)
    this.player.setDisplaySize(TILE_SIZE, TILE_SIZE)
    this.player.setDepth(10)
    this.currentDir = gd.playerDirection
    this.updatePlayerFrame()

    // Spawn party followers
    this.followers = []
    this.followerPositions = []
    const dirs = [[0, 1], [0, 2], [0, 3]] // trail offsets
    for (let i = 1; i < gd.party.length && i <= 3; i++) {
      const memberId = gd.party[i]!
      const key = `${memberId.toLowerCase()}_front_idle_01`
      const ox = dirs[i - 1]![0]!
      const oy = dirs[i - 1]![1]!
      const fx = (px - ox) * TILE_SIZE + TILE_SIZE / 2
      const fy = (py - oy) * TILE_SIZE + TILE_SIZE / 2
      const follower = this.add.sprite(fx, fy, key)
      follower.setDisplaySize(TILE_SIZE, TILE_SIZE)
      follower.setDepth(9)
      this.followers.push(follower)
      this.followerPositions.push({ x: fx, y: fy })
    }

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setFollowOffset(0, 0)
  }

  private spawnNPCs(): void {
    const gd = GameData.getInstance()
    for (const event of this.mapData.events) {
      if (event.type === 'npc' && event.sprite) {
        const sx = event.x * TILE_SIZE + TILE_SIZE / 2
        const sy = event.y * TILE_SIZE + TILE_SIZE / 2
        const npc = this.add.sprite(sx, sy, event.sprite)
        npc.setDisplaySize(TILE_SIZE, TILE_SIZE)
        npc.setDepth(10)
        this.npcs.set(event.id, npc)
      }
    }

    for (const event of this.mapData.events) {
      if (event.type !== 'battle') continue
      const defeatedFlag = `defeated_${event.id}`
      if (gd.getFlag(defeatedFlag) === true) continue

      const sx = event.x * TILE_SIZE + TILE_SIZE / 2
      const sy = event.y * TILE_SIZE + TILE_SIZE / 2
      const encounterId = event.actions.find(a => a.type === 'battle')?.encounterId as string | undefined
      const spriteKey = this.getEnemySpriteKey(encounterId)
      const textureKey = this.textures.exists(spriteKey) ? spriteKey : DEFAULT_ENEMY_SPRITE_KEY
      const enemySprite = this.add.sprite(sx, sy, textureKey)
      enemySprite.setDisplaySize(TILE_SIZE, TILE_SIZE)
      enemySprite.setDepth(10)
      this.battleEnemies.set(event.id, enemySprite)

      const originX = sx
      const originY = sy
      const timer = this.time.addEvent({
        delay: 2000 + Math.random() * 3000,
        loop: true,
        callback: () => {
          const dx = (Math.random() - 0.5) * TILE_SIZE * 2
          const dy = (Math.random() - 0.5) * TILE_SIZE * 2
          const nx = Phaser.Math.Clamp(originX + dx, originX - TILE_SIZE, originX + TILE_SIZE)
          const ny = Phaser.Math.Clamp(originY + dy, originY - TILE_SIZE, originY + TILE_SIZE)
          this.tweens.add({
            targets: enemySprite,
            x: nx,
            y: ny,
            duration: 800,
            ease: 'Linear',
          })
        },
      })
      this.enemyPatrolTimers.push(timer)
    }
  }

  private createEvents(): void {
    for (const event of this.mapData.events) {
      if (event.type === 'chest') {
        const opened = GameData.getInstance().getFlag(`chest_opened_${event.id}`) === true
        if (!opened) {
          const img = this.add.image(
            event.x * TILE_SIZE, event.y * TILE_SIZE, 'env_barrel'
          )
          img.setOrigin(0, 0)
          img.setDisplaySize(TILE_SIZE, TILE_SIZE)
          img.setDepth(8)
        }
      }

      const rect = this.add.rectangle(
        event.x * TILE_SIZE + event.width * TILE_SIZE / 2,
        event.y * TILE_SIZE + event.height * TILE_SIZE / 2,
        event.width * TILE_SIZE,
        event.height * TILE_SIZE,
        0xff0000, 0
      )
      rect.setDepth(20)
      rect.setData('event', event)
      this.eventObjects.push(rect)
    }
  }

  private setupInput(): void {
    const kb = this.input.keyboard!
    const bindings = InputManager.getInstance().getBindings()
    this.cursors = kb.createCursorKeys()
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.actionKeys = {
      up: kb.addKey(bindings.up),
      down: kb.addKey(bindings.down),
      left: kb.addKey(bindings.left),
      right: kb.addKey(bindings.right),
    }

    kb.on('keydown', (event: KeyboardEvent) => {
      const input = InputManager.getInstance()
      if (input.isConfirm(event.code)) {
        this.interact()
      } else if (input.isMenu(event.code) || input.isCancel(event.code)) {
        this.openMenu()
      }
    })
  }

  private createUI(): void {
    // Status bar (fixed to camera)
    const gd = GameData.getInstance()
    const leader = gd.party[0] || 'T'
    const char = gd.characters.get(leader)

    if (char) {
      const statusText = this.add.text(10, 10, `${char.name} HP:${char.stats.hp}/${char.stats.maxHp} MP:${char.stats.mp}/${char.stats.maxMp}`, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 6, y: 3 },
      })
      statusText.setScrollFactor(0)
      statusText.setDepth(100)
      this.uiTexts.push(statusText)
    }

    // Interaction prompt
    const prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Space 调查/对话 | Tab 菜单', {
      fontSize: '12px',
      color: '#cccccc',
      backgroundColor: '#00000080',
      padding: { x: 6, y: 3 },
    })
    prompt.setOrigin(0.5)
    prompt.setScrollFactor(0)
    prompt.setDepth(100)
    this.uiTexts.push(prompt)
  }

  private showMapName(): void {
    this.mapNameText = this.add.text(GAME_WIDTH / 2, 40, this.mapData.name, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#00000060',
      padding: { x: 12, y: 6 },
    })
    this.mapNameText.setOrigin(0.5)
    this.mapNameText.setScrollFactor(0)
    this.mapNameText.setDepth(100)
    this.mapNameText.setAlpha(0)

    this.tweens.add({
      targets: this.mapNameText,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: this.mapNameText,
            alpha: 0,
            duration: 500,
          })
        })
      },
    })
  }

  private handleInput(): void {
    let dx = 0
    let dy = 0
    let dir = this.currentDir

    if (!!this.cursors.up?.isDown || this.wasd.W.isDown || this.actionKeys.up.isDown) {
      dy = -1
      dir = 0
    } else if (!!this.cursors.down?.isDown || this.wasd.S.isDown || this.actionKeys.down.isDown) {
      dy = 1
      dir = 2
    } else if (!!this.cursors.left?.isDown || this.wasd.A.isDown || this.actionKeys.left.isDown) {
      dx = -1
      dir = 3
    } else if (!!this.cursors.right?.isDown || this.wasd.D.isDown || this.actionKeys.right.isDown) {
      dx = 1
      dir = 1
    }

    if (dx === 0 && dy === 0 && InputManager.getInstance().isGamepadEnabled()) {
      const gp = this.pollGamepadAxes()
      if (gp) {
        if (gp.dy < -0.3) { dy = -1; dir = 0 }
        else if (gp.dy > 0.3) { dy = 1; dir = 2 }
        else if (gp.dx < -0.3) { dx = -1; dir = 3 }
        else if (gp.dx > 0.3) { dx = 1; dir = 1 }
      }
    }

    if (dx !== 0 || dy !== 0) {
      const gx = Math.floor(this.player.x / TILE_SIZE)
      const gy = Math.floor(this.player.y / TILE_SIZE)
      const tx = gx + dx
      const ty = gy + dy

      if (this.canMoveTo(tx, ty)) {
        this.startMove(tx, ty, dir)
      } else {
        this.currentDir = dir
        this.updatePlayerFrame()
      }
    }
  }

  private pollGamepadAxes(): { dx: number; dy: number } | null {
    if (!this.input.gamepad || this.input.gamepad.total === 0) return null
    const pad = this.input.gamepad.getPad(0)
    if (!pad) return null

    const axisX = pad.leftStick?.x || 0
    const axisY = pad.leftStick?.y || 0
    const dLeft = pad.left ? 1 : 0
    const dRight = pad.right ? 1 : 0
    const dUp = pad.up ? 1 : 0
    const dDown = pad.down ? 1 : 0
    const dx = axisX || (dRight - dLeft)
    const dy = axisY || (dDown - dUp)

    if (Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) return null
    return { dx, dy }
  }

  private pollGamepadButtons(): void {
    if (!InputManager.getInstance().isGamepadEnabled()) return
    if (!this.input.gamepad || this.input.gamepad.total === 0) return
    const pad = this.input.gamepad.getPad(0)
    if (!pad) return

    const aPressed = !!pad.A
    if (aPressed && !this.gpConfirmPrev) {
      this.interact()
    }
    this.gpConfirmPrev = aPressed

    const bPressed = !!pad.B
    if (bPressed && !this.gpCancelPrev) {
      this.openMenu()
    }
    this.gpCancelPrev = bPressed

    const startPressed = !!(pad.buttons && pad.buttons[9]?.pressed)
    if (startPressed && !this.gpMenuPrev) {
      this.openMenu()
    }
    this.gpMenuPrev = startPressed
  }

  private canMoveTo(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return false
    if (this.collisionGrid[y]![x]) return false
    // Check NPCs
    for (const event of this.mapData.events) {
      if (event.type === 'npc' && event.x === x && event.y === y) return false
    }
    return true
  }

  private startMove(tx: number, ty: number, dir: number): void {
    this.isMoving = true
    this.moveStart = { x: this.player.x, y: this.player.y }
    this.moveTarget = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 }
    this.moveElapsed = 0
    const distance = Phaser.Math.Distance.Between(this.moveStart.x, this.moveStart.y, this.moveTarget.x, this.moveTarget.y)
    this.moveDuration = distance / (this.moveSpeed * TILE_SIZE)
    this.currentDir = dir
    this.updatePlayerFrame()
  }

  private updateMovement(delta: number): void {
    const dt = delta / 1000
    this.moveElapsed += dt

    const prevPx = this.player.x
    const prevPy = this.player.y
    const progress = this.moveDuration > 0 ? Math.min(1, this.moveElapsed / this.moveDuration) : 1

    this.player.x = Phaser.Math.Linear(this.moveStart.x, this.moveTarget.x, progress)
    this.player.y = Phaser.Math.Linear(this.moveStart.y, this.moveTarget.y, progress)

    if (progress >= 1) {
      this.isMoving = false
      this.savePosition()
      this.checkTouchEvents()
    }

    if (this.followers.length > 0) {
      let leadX = prevPx
      let leadY = prevPy
      for (const follower of this.followers) {
        const fPrevX = follower.x
        const fPrevY = follower.y
        const dist = Phaser.Math.Distance.Between(follower.x, follower.y, leadX, leadY)
        if (dist > TILE_SIZE * FOLLOWER_MIN_DISTANCE_FACTOR) {
          const angle = Phaser.Math.Angle.Between(follower.x, follower.y, leadX, leadY)
          const step = Math.min(dist, this.moveSpeed * TILE_SIZE * dt)
          follower.x += Math.cos(angle) * step
          follower.y += Math.sin(angle) * step
          follower.setFlipX(Math.cos(angle) < 0)
        }
        leadX = fPrevX
        leadY = fPrevY
      }
    }
  }

  private updatePlayerFrame(): void {
    const leader = GameData.getInstance().party[0] || 'T'
    const name = leader.toLowerCase()
    const frames = ['back_idle_01', 'side_walk_01', 'front_idle_01', 'side_walk_01']
    const frame = frames[this.currentDir]
    this.player.setTexture(`${name}_${frame}`)
    this.player.setFlipX(this.currentDir === 3)
  }

  private savePosition(): void {
    const gd = GameData.getInstance()
    gd.playerPosition = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    }
    gd.playerDirection = this.currentDir
  }

  private checkTouchEvents(): void {
    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)

    for (const event of this.mapData.events) {
      if (event.type === 'battle') {
        const enemySprite = this.battleEnemies.get(event.id)
        if (enemySprite) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemySprite.x, enemySprite.y)
          if (dist < TILE_SIZE * 0.8) {
            this.triggerEvent(event)
            return
          }
        }
        continue
      }
      if (event.trigger !== 'touch' && event.trigger !== 'autorun') continue
      if (this.checkEventCollision(event, px, py)) {
        this.triggerEvent(event)
        return
      }
    }

    // Random encounter
    const gd = GameData.getInstance()
    const encRate = gd.settings.encounterRate as string
    let encounterMultiplier = 1.0
    if (encRate === 'low') encounterMultiplier = 0.5
    else if (encRate === 'off') encounterMultiplier = 0.0
    if (this.mapData.encounters && this.mapData.encounters.length > 0 && Math.random() < this.mapData.encounterRate * encounterMultiplier) {
      const encounterId = this.mapData.encounters[Math.floor(Math.random() * this.mapData.encounters.length)]!
      AudioManager.getInstance().playSFX('encounter')
      this.startBattle(encounterId)
    }
  }

  private interact(): void {
    if (this.inEvent) return

    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)
    const dx = DIRECTION_VECTORS[this.currentDir]!.x
    const dy = DIRECTION_VECTORS[this.currentDir]!.y
    const fx = px + dx
    const fy = py + dy

    for (const event of this.mapData.events) {
      if (event.trigger !== 'action') continue
      if (this.checkEventCollision(event, fx, fy) || this.checkEventCollision(event, px, py)) {
        this.triggerEvent(event)
        return
      }
    }
  }

  private checkEventCollision(event: MapEvent, x: number, y: number): boolean {
    return x >= event.x && x < event.x + event.width &&
           y >= event.y && y < event.y + event.height
  }

  private checkAutorunEvents(): void {
    const gd = GameData.getInstance()
    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)

    for (const event of this.mapData.events) {
      if (event.trigger === 'autorun' && this.checkEventCollision(event, px, py)) {
        if (event.type !== 'npc') {
          const doneFlag = `event_done_${event.id}`
          if (gd.getFlag(doneFlag) === true) continue
        }
        this.triggerEvent(event)
        return
      }
    }
  }

  private triggerEvent(event: MapEvent): void {
    this.inEvent = true
    const gd = GameData.getInstance()

    if (event.type === 'chest') {
      const flag = `chest_opened_${event.id}`
      if (gd.getFlag(flag) === true) {
        this.inEvent = false
        return
      }
      gd.setFlag(flag, true)
    }

    if (event.type !== 'npc') {
      const doneFlag = `event_done_${event.id}`
      if (gd.getFlag(doneFlag) === true) {
        this.inEvent = false
        return
      }
    }

    if (event.type === 'battle') {
      const defeatedFlag = `defeated_${event.id}`
      if (gd.getFlag(defeatedFlag) === true) {
        this.inEvent = false
        return
      }
    }

    if (event.conditions && event.conditions.length > 0) {
      for (const cond of event.conditions) {
        if (cond.flag !== undefined) {
          const flagValue = gd.getFlag(cond.flag) ?? false
          if (flagValue !== cond.value) {
            this.inEvent = false
            return
          }
        }
      }
    }

    this.executeActions(event.actions, event.type === 'battle' ? event.id : undefined)

    if (event.type !== 'npc' && event.type !== 'battle') {
      if (event.trigger === 'touch' || event.trigger === 'autorun' || event.trigger === 'action') {
        gd.setFlag(`event_done_${event.id}`, true)
      }
    }
  }

  private startDialogue(dialogueId: string): void {
    this.scene.launch('DialogueOverlay', { dialogueId })
    this.scene.pause()
  }

  private startBattle(encounterId: string, mapEventId?: string): void {
    EventBus.emit(GameEvents.BATTLE_START, encounterId)
    this.scene.launch('BattleScene', { encounterId, mapEventId })
    this.scene.pause()
  }

  private transferMap(mapId: string, x: number, y: number): void {
    AudioManager.getInstance().playSFX('warp')
    const gd = GameData.getInstance()
    gd.currentMap = mapId
    gd.playerPosition = { x, y }
    this.scene.restart({ mapId })
  }

  private openMenu(): void {
    if (this.inEvent) return
    AudioManager.getInstance().playSFX('open_menu')
    this.inEvent = true
    this.scene.launch('MenuOverlay')
    this.scene.pause()
  }

  private onDialogueEnd(data?: { actions?: EventAction[] }): void {
    this.scene.resume()
    const pending = [...(data?.actions || []), ...this.pendingActions]
    const mapEventId = this.pendingMapEventId
    this.pendingActions = []
    this.pendingMapEventId = ''

    if (pending.length > 0) {
      this.inEvent = true
      this.executeActions(pending, mapEventId)
      return
    }
    this.inEvent = false
  }

  private executeActions(actions: EventAction[], mapEventId = ''): void {
    const gd = GameData.getInstance()
    const qs = QuestSystem.getInstance()
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]!
      switch (action.type) {
        case 'dialogue':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.startDialogue(action.dialogueId)
          return
        case 'battle':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.startBattle(action.encounterId, mapEventId)
          return
        case 'transfer':
          this.pendingActions = []
          this.pendingMapEventId = ''
          this.transferMap(action.targetMap, action.targetX, action.targetY)
          return
        case 'questStart':
          qs.startQuest(action.questId)
          break
        case 'questAdvance':
          qs.advanceQuest(action.questId, action.amount || 1)
          break
        case 'questComplete':
          qs.completeQuest(action.questId)
          break
        case 'setFlag':
          gd.setFlag(action.flag, action.value)
          break
        case 'setBranch':
          gd.updateBranch(action.branch, action.value)
          break
        case 'adjustTrust':
          gd.adjustTrust(action.characterId, action.amount || 1)
          break
        case 'adjustMercy':
          gd.adjustMercy(action.amount || 1)
          break
        case 'addItem':
          gd.addItem(action.itemId, action.quantity || 1)
          break
        case 'addParty':
          gd.addPartyMember(action.characterId)
          break
        case 'rebuild':
          RebuildSystem.getInstance().setLevel(Math.max(gd.rebuildLevel, action.level || 0))
          break
        case 'shop':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.scene.launch('ShopOverlay')
          this.scene.pause()
          return
        case 'training':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.scene.launch('TrainingOverlay')
          this.scene.pause()
          return
        case 'rebuildMenu':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.scene.launch('RebuildOverlay')
          this.scene.pause()
          return
      }
    }
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.inEvent = false
  }

  private onBattleEnd(victory: boolean): void {
    this.scene.resume()

    if (this.pendingMapEventId) {
      const dv = DIRECTION_VECTORS[this.currentDir]!
      this.player.x -= dv.x * TILE_SIZE
      this.player.y -= dv.y * TILE_SIZE
      this.savePosition()
    }

    for (const [eventId, sprite] of this.battleEnemies) {
      const defeatedFlag = `defeated_${eventId}`
      if (GameData.getInstance().getFlag(defeatedFlag) === true) {
        sprite.destroy()
        this.battleEnemies.delete(eventId)
      }
    }

    const pending = this.pendingActions
    const mapEventId = this.pendingMapEventId
    this.pendingActions = []
    this.pendingMapEventId = ''
    if (victory && pending.length > 0) {
      this.inEvent = true
      this.executeActions(pending, mapEventId)
      return
    }
    this.inEvent = false
  }

  private onMenuClose(): void {
    this.scene.resume()
    const pending = this.pendingActions
    const mapEventId = this.pendingMapEventId
    this.pendingActions = []
    this.pendingMapEventId = ''
    if (pending.length > 0) {
      this.inEvent = true
      this.executeActions(pending, mapEventId)
      return
    }
    this.inEvent = false
  }


  private weatherEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null


  private npcTimers: Phaser.Time.TimerEvent[] = []

  private startNPCMovement(): void {
    for (const event of this.mapData.events) {
      if (event.type !== 'npc' || !event.sprite) continue
      const npc = this.npcs.get(event.id)
      if (!npc) continue
      const originX = npc.x
      const originY = npc.y
      const timer = this.time.addEvent({
        delay: 3000 + Math.random() * 4000,
        loop: true,
        callback: () => {
          const dx = (Math.random() - 0.5) * TILE_SIZE * 2
          const dy = (Math.random() - 0.5) * TILE_SIZE * 2
          const nx = Phaser.Math.Clamp(originX + dx, originX - TILE_SIZE * 2, originX + TILE_SIZE * 2)
          const ny = Phaser.Math.Clamp(originY + dy, originY - TILE_SIZE * 2, originY + TILE_SIZE * 2)
          this.tweens.add({
            targets: npc,
            x: nx,
            y: ny,
            duration: 1000,
            ease: 'Linear',
          })
        },
      })
      this.npcTimers.push(timer)
    }
  }

  private getEnemySpriteKey(encounterId?: string): string {
    if (!encounterId) return DEFAULT_ENEMY_SPRITE_KEY
    const enemyId = ENCOUNTERS[encounterId]?.enemies[0]
    return enemyId ? `mon_${enemyId}_01` : DEFAULT_ENEMY_SPRITE_KEY
  }

  private createWeather(): void {
    const rainMaps = ['MAP_040', 'MAP_041', 'MAP_050', 'MAP_061']
    const snowMaps: string[] = []

    if (rainMaps.includes(this.mapData.id)) {
      this.startRain()
    } else if (snowMaps.includes(this.mapData.id)) {
      this.startSnow()
    }
  }

  private startRain(): void {
    const particles = this.add.particles(0, 0, 'env_dirt_pebbles', {
      speed: { min: 200, max: 400 },
      angle: 260,
      gravityY: 300,
      lifespan: 800,
      quantity: 3,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.3, end: 0 },
      emitZone: { source: new Phaser.Geom.Rectangle(-200, -50, GAME_WIDTH + 400, 10) as any, type: 'random' as const },
    })
    particles.setDepth(90)
    particles.setScrollFactor(0)
    this.weatherEmitter = particles
  }

  private startSnow(): void {
    const particles = this.add.particles(0, 0, 'env_flowers_patch_white', {
      speed: { min: 20, max: 60 },
      angle: 270,
      gravityY: 20,
      lifespan: 4000,
      quantity: 1,
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.5, end: 0 },
      emitZone: { source: new Phaser.Geom.Rectangle(-100, -50, GAME_WIDTH + 200, 10) as any, type: 'random' as const },
    })
    particles.setDepth(90)
    particles.setScrollFactor(0)
    this.weatherEmitter = particles
  }

  shutdown(): void {
    EventBus.off(GameEvents.DIALOGUE_END, this.onDialogueEnd, this)
    EventBus.off(GameEvents.BATTLE_END, this.onBattleEnd, this)
    EventBus.off(GameEvents.MENU_CLOSE, this.onMenuClose, this)
    window.removeEventListener('game-quicksave', this.handleQuickSave)
    window.removeEventListener('game-quickload', this.handleQuickLoad)
  }
}
