import './styles.css'
import {
  GAME_CONFIG_DATABASE,
  GAME_CONFIG_TABLE_KEYS,
  cloneConfigData,
  type GameConfigTableKey,
} from '../data/configDatabase'
import {
  CONFIG_EDITOR_EVENT_COLORS,
  CONFIG_EDITOR_FALLBACK_COLORS,
  CONFIG_EDITOR_ID_FALLBACK_PREFIX,
  CONFIG_EDITOR_JSON_INDENT,
  CONFIG_EDITOR_PREVIEW,
  CONFIG_EDITOR_SPRITE,
  CONFIG_EDITOR_TABLE_LABELS,
  CONFIG_EDITOR_TILE_COLORS,
  MAP_LAYER_INDEX,
  SPRITE_CROP_DEFAULTS,
} from '../utils/constants'
import type { SpriteCropConfig } from '../data/spriteCrops'
import type { CharacterStats, MapData, MapEvent } from '../data/types'

interface RecordEntry {
  id: string
  label: string
  subtitle: string
  value: unknown
  searchText: string
}

interface EditorState {
  activeTable: GameConfigTableKey
  selectedId: string
  search: string
}

type SpriteCropField = Exclude<keyof SpriteCropConfig, 'key'>
type SpriteDragMode = 'move' | 'resize' | null

interface SpriteViewport {
  scale: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

const state: EditorState = {
  activeTable: 'maps',
  selectedId: '',
  search: '',
}

const SPRITE_CROP_FIELDS: { key: SpriteCropField; label: string }[] = [
  { key: 'sourceX', label: 'X' },
  { key: 'sourceY', label: 'Y' },
  { key: 'sourceWidth', label: '宽' },
  { key: 'sourceHeight', label: '高' },
  { key: 'outputWidth', label: '输出宽' },
  { key: 'outputHeight', label: '输出高' },
  { key: 'offsetX', label: '偏移 X' },
  { key: 'offsetY', label: '偏移 Y' },
]

const root = queryElement<HTMLDivElement>('#editor-root')
root.innerHTML = `
  <main class="app">
    <header class="topbar">
      <div class="brand">
        <h1>CaskTown 配置编辑器</h1>
        <span>数据编辑、地图预览、运行时覆盖</span>
      </div>
      <div class="actions">
        <button id="open-game">打开游戏</button>
        <button id="import-config">导入</button>
        <button id="export-config">导出</button>
        <button id="apply-config" class="primary">应用到游戏</button>
        <button id="reset-config" class="danger">重置覆盖</button>
        <input id="import-file" type="file" accept="application/json" hidden>
      </div>
    </header>
    <section class="shell">
      <aside class="sidebar">
        <div class="section-head"><h2>配置数据库</h2><span id="table-total" class="pill"></span></div>
        <div id="table-list" class="sidebar-list"></div>
      </aside>
      <section class="records">
        <div class="section-head">
          <h2 id="record-title">记录</h2>
          <button id="duplicate-record">复制</button>
        </div>
        <input id="search" class="search" placeholder="搜索 ID、名称、描述">
        <div id="record-list" class="record-list"></div>
      </section>
      <section class="preview">
        <div class="section-head"><h2>可视化预览</h2><span id="selected-pill" class="pill"></span></div>
        <div id="preview-body" class="preview-body"></div>
      </section>
      <section class="inspector">
        <div class="section-head">
          <h2>JSON 编辑</h2>
          <div class="editor-tools">
            <button id="save-record" class="primary">保存</button>
            <button id="delete-record" class="danger">删除</button>
          </div>
        </div>
        <div class="inspector-body">
          <textarea id="json-editor" spellcheck="false"></textarea>
          <div id="status" class="status"></div>
        </div>
      </section>
    </section>
  </main>
`

const elements = {
  tableTotal: queryElement<HTMLSpanElement>('#table-total'),
  tableList: queryElement<HTMLDivElement>('#table-list'),
  recordTitle: queryElement<HTMLHeadingElement>('#record-title'),
  recordList: queryElement<HTMLDivElement>('#record-list'),
  selectedPill: queryElement<HTMLSpanElement>('#selected-pill'),
  previewBody: queryElement<HTMLDivElement>('#preview-body'),
  jsonEditor: queryElement<HTMLTextAreaElement>('#json-editor'),
  status: queryElement<HTMLDivElement>('#status'),
  search: queryElement<HTMLInputElement>('#search'),
  saveRecord: queryElement<HTMLButtonElement>('#save-record'),
  deleteRecord: queryElement<HTMLButtonElement>('#delete-record'),
  duplicateRecord: queryElement<HTMLButtonElement>('#duplicate-record'),
  openGame: queryElement<HTMLButtonElement>('#open-game'),
  importConfig: queryElement<HTMLButtonElement>('#import-config'),
  exportConfig: queryElement<HTMLButtonElement>('#export-config'),
  applyConfig: queryElement<HTMLButtonElement>('#apply-config'),
  resetConfig: queryElement<HTMLButtonElement>('#reset-config'),
  importFile: queryElement<HTMLInputElement>('#import-file'),
}

let searchTimer = 0

elements.search.addEventListener('input', () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    state.search = elements.search.value.trim().toLowerCase()
    renderRecords()
  }, CONFIG_EDITOR_PREVIEW.SEARCH_DEBOUNCE_MS)
})

elements.jsonEditor.addEventListener('input', validateEditor)
elements.saveRecord.addEventListener('click', saveSelectedRecord)
elements.deleteRecord.addEventListener('click', deleteSelectedRecord)
elements.duplicateRecord.addEventListener('click', duplicateSelectedRecord)
elements.openGame.addEventListener('click', () => window.open('/', '_blank', 'noopener,noreferrer'))
elements.applyConfig.addEventListener('click', () => {
  GAME_CONFIG_DATABASE.persist()
  setStatus('配置已写入浏览器本地覆盖，刷新游戏后生效。', 'ok')
})
elements.resetConfig.addEventListener('click', () => {
  GAME_CONFIG_DATABASE.reset()
  state.selectedId = ''
  renderAll()
  setStatus('配置覆盖已重置。', 'ok')
})
elements.exportConfig.addEventListener('click', exportConfig)
elements.importConfig.addEventListener('click', () => elements.importFile.click())
elements.importFile.addEventListener('change', importConfig)

renderAll()

function queryElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing editor element ${selector}`)
  return element
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getObjectId(value: unknown): string | null {
  if (!isRecordObject(value)) return null
  return typeof value.id === 'string' ? value.id : null
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, CONFIG_EDITOR_JSON_INDENT)
}

function getTableEntries(tableKey: GameConfigTableKey): RecordEntry[] {
  const table = GAME_CONFIG_DATABASE.getTable(tableKey)
  if (Array.isArray(table)) {
    return table.map((value, index) => {
      const id = getObjectId(value) ?? `${CONFIG_EDITOR_ID_FALLBACK_PREFIX}_${index + 1}`
      return createEntry(id, value)
    })
  }
  if (!isRecordObject(table)) return []
  return Object.entries(table).map(([id, value]) => createEntry(id, value))
}

function createEntry(id: string, value: unknown): RecordEntry {
  const label = getRecordLabel(id, value)
  const subtitle = getRecordSubtitle(value)
  let searchText = `${id} ${label} ${subtitle}`
  try {
    searchText += ` ${JSON.stringify(value)}`
  } catch (error) {
    console.warn(`Failed to index record ${id}`, error)
  }
  return { id, label, subtitle, value, searchText: searchText.toLowerCase() }
}

function getRecordLabel(id: string, value: unknown): string {
  if (!isRecordObject(value)) return `${id}: ${String(value)}`
  const name = value.name ?? value.chapter ?? value.key
  return typeof name === 'string' ? `${id} · ${name}` : id
}

function getRecordSubtitle(value: unknown): string {
  if (!isRecordObject(value)) return typeof value === 'string' ? value : ''
  const description = value.description ?? value.verse ?? value.text ?? value.path
  if (typeof description === 'string') return description.slice(0, CONFIG_EDITOR_PREVIEW.VALIDATION_PREVIEW_LENGTH)
  if (Array.isArray(value.lines)) return `${value.lines.length} lines`
  if (Array.isArray(value.events)) return `${value.events.length} events`
  return ''
}

function getFilteredEntries(): RecordEntry[] {
  const entries = getTableEntries(state.activeTable)
  if (!state.search) return entries.slice(0, CONFIG_EDITOR_PREVIEW.RECORD_LIST_LIMIT)
  return entries.filter(entry => entry.searchText.includes(state.search)).slice(0, CONFIG_EDITOR_PREVIEW.RECORD_LIST_LIMIT)
}

function renderAll(): void {
  renderTables()
  renderRecords()
}

function renderTables(): void {
  elements.tableList.replaceChildren()
  elements.tableTotal.textContent = `${GAME_CONFIG_TABLE_KEYS.length}`
  for (const key of GAME_CONFIG_TABLE_KEYS) {
    const button = document.createElement('button')
    button.className = `table-button${key === state.activeTable ? ' active' : ''}`
    button.type = 'button'
    const label = document.createElement('span')
    label.textContent = CONFIG_EDITOR_TABLE_LABELS[key]
    const count = document.createElement('span')
    count.className = 'count'
    count.textContent = String(getTableEntries(key).length)
    button.append(label, count)
    button.addEventListener('click', () => {
      state.activeTable = key
      state.selectedId = ''
      state.search = ''
      elements.search.value = ''
      renderAll()
    })
    elements.tableList.append(button)
  }
}

function renderRecords(): void {
  const entries = getFilteredEntries()
  if (!state.selectedId && entries[0]) state.selectedId = entries[0].id
  if (state.selectedId && !entries.some(entry => entry.id === state.selectedId) && entries[0]) state.selectedId = entries[0].id

  elements.recordTitle.textContent = `${CONFIG_EDITOR_TABLE_LABELS[state.activeTable]} · ${entries.length}`
  elements.recordList.replaceChildren()
  if (entries.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = '没有匹配记录'
    elements.recordList.append(empty)
  }
  for (const entry of entries) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `record-button${entry.id === state.selectedId ? ' active' : ''}`
    const title = document.createElement('span')
    title.className = 'record-title'
    title.textContent = entry.label
    const type = document.createElement('span')
    type.className = 'count'
    type.textContent = getValueKind(entry.value)
    const subtitle = document.createElement('span')
    subtitle.className = 'record-subtitle'
    subtitle.textContent = entry.subtitle
    button.append(title, type, subtitle)
    button.addEventListener('click', () => {
      state.selectedId = entry.id
      renderRecords()
    })
    elements.recordList.append(button)
  }
  renderSelected(entries.find(entry => entry.id === state.selectedId) ?? entries[0] ?? null)
}

function renderSelected(entry: RecordEntry | null): void {
  elements.selectedPill.textContent = entry?.id ?? ''
  elements.jsonEditor.value = entry ? stringify(entry.value) : ''
  elements.saveRecord.disabled = !entry
  elements.deleteRecord.disabled = !entry
  elements.duplicateRecord.disabled = !entry
  validateEditor()
  renderPreview(entry)
}

function getValueKind(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (isRecordObject(value)) return 'object'
  return typeof value
}

function validateEditor(): boolean {
  if (!elements.jsonEditor.value.trim()) {
    setStatus('请选择一条记录。', 'error')
    elements.saveRecord.disabled = true
    return false
  }
  try {
    JSON.parse(elements.jsonEditor.value)
    setStatus('JSON 有效。', 'ok')
    elements.saveRecord.disabled = false
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus(`JSON 无效：${message}`, 'error')
    elements.saveRecord.disabled = true
    return false
  }
}

function setStatus(message: string, mode: 'idle' | 'ok' | 'error' = 'idle'): void {
  elements.status.textContent = message
  elements.status.className = `status${mode === 'idle' ? '' : ` ${mode}`}`
}

function saveSelectedRecord(): void {
  if (!validateEditor() || !state.selectedId) return
  try {
    const parsed = JSON.parse(elements.jsonEditor.value) as unknown
    const nextId = getObjectId(parsed) ?? state.selectedId
    const table = GAME_CONFIG_DATABASE.getTable(state.activeTable)
    if (!Array.isArray(table) && nextId !== state.selectedId) {
      GAME_CONFIG_DATABASE.deleteRecord(state.activeTable, state.selectedId)
    }
    GAME_CONFIG_DATABASE.setRecord(state.activeTable, nextId, parsed)
    state.selectedId = nextId
    renderTables()
    renderRecords()
    setStatus('记录已保存。', 'ok')
  } catch (error) {
    console.error('Failed to save configuration record', error)
    setStatus('保存失败，详情见控制台。', 'error')
  }
}

function deleteSelectedRecord(): void {
  if (!state.selectedId) return
  GAME_CONFIG_DATABASE.deleteRecord(state.activeTable, state.selectedId)
  state.selectedId = ''
  renderTables()
  renderRecords()
  setStatus('记录已删除。', 'ok')
}

function duplicateSelectedRecord(): void {
  const entry = getTableEntries(state.activeTable).find(item => item.id === state.selectedId)
  if (!entry) return
  const clone = cloneConfigData(entry.value)
  const nextId = `${entry.id}_copy`
  if (isRecordObject(clone)) clone.id = nextId
  GAME_CONFIG_DATABASE.setRecord(state.activeTable, nextId, clone)
  state.selectedId = nextId
  renderTables()
  renderRecords()
  setStatus('记录已复制。', 'ok')
}

function exportConfig(): void {
  const blob = new Blob([stringify(GAME_CONFIG_DATABASE.exportSnapshot())], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'casktown-config-database.json'
  link.click()
  URL.revokeObjectURL(url)
}

function importConfig(): void {
  const file = elements.importFile.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.addEventListener('load', () => {
    try {
      const snapshot = JSON.parse(String(reader.result)) as Parameters<typeof GAME_CONFIG_DATABASE.importSnapshot>[0]
      GAME_CONFIG_DATABASE.importSnapshot(snapshot)
      state.selectedId = ''
      renderAll()
      setStatus('配置已导入。', 'ok')
    } catch (error) {
      console.error('Failed to import configuration database', error)
      setStatus('导入失败，文件不是有效配置 JSON。', 'error')
    } finally {
      elements.importFile.value = ''
    }
  })
  reader.readAsText(file)
}

function renderPreview(entry: RecordEntry | null): void {
  elements.previewBody.replaceChildren()
  if (!entry) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = '选择记录后显示预览'
    elements.previewBody.append(empty)
    return
  }
  if (state.activeTable === 'maps' && isMapData(entry.value)) {
    renderMapPreview(entry.value)
    return
  }
  if (state.activeTable === 'imageAssets' && typeof entry.value === 'string') {
    renderSpriteEditor(entry.id, entry.value)
    return
  }
  if (state.activeTable === 'spriteCrops' && isSpriteCropConfig(entry.value)) {
    renderSpriteEditor(entry.value.key, GAME_CONFIG_DATABASE.getTable('imageAssets')[entry.value.key] ?? '')
    return
  }
  const summary = document.createElement('div')
  summary.className = 'summary'
  const metrics = document.createElement('div')
  metrics.className = 'metric-grid'
  appendMetric(metrics, '类型', getValueKind(entry.value))
  appendMetric(metrics, 'ID', entry.id)
  appendMetric(metrics, '字段', String(isRecordObject(entry.value) ? Object.keys(entry.value).length : CONFIG_EDITOR_PREVIEW.PRIMITIVE_FIELD_COUNT))
  summary.append(metrics)
  if (isRecordObject(entry.value)) renderObjectPreview(summary, entry.value)
  else appendDetail(summary, '值', String(entry.value))
  elements.previewBody.append(summary)
}

function renderObjectPreview(container: HTMLElement, value: Record<string, unknown>): void {
  if (isStatsCarrier(value)) container.append(renderStatBars(value.stats))
  const details = document.createElement('div')
  details.className = 'detail-list'
  for (const key of Object.keys(value)) {
    const item = value[key]
    if (key === 'stats') continue
    if (Array.isArray(item)) {
      appendDetail(details, key, item.join(', '))
    } else if (isRecordObject(item)) {
      appendDetail(details, key, stringify(item))
    } else {
      appendDetail(details, key, String(item ?? ''))
    }
  }
  container.append(details)
}

function appendMetric(container: HTMLElement, label: string, value: string): void {
  const metric = document.createElement('div')
  metric.className = 'metric'
  const strong = document.createElement('strong')
  strong.textContent = value
  const span = document.createElement('span')
  span.textContent = label
  metric.append(strong, span)
  container.append(metric)
}

function appendDetail(container: HTMLElement, label: string, value: string): void {
  const row = document.createElement('div')
  row.className = 'detail-row'
  const key = document.createElement('span')
  key.textContent = label
  const text = document.createElement('span')
  text.textContent = value
  row.append(key, text)
  container.append(row)
}

function isStatsCarrier(value: Record<string, unknown>): value is Record<string, unknown> & { stats: CharacterStats } {
  return isRecordObject(value.stats)
}

function renderStatBars(stats: CharacterStats): HTMLElement {
  const bars = document.createElement('div')
  bars.className = 'bars'
  const keys = ['hp', 'mp', 'atk', 'def', 'matk', 'mdef', 'speed'] as const
  for (const key of keys) {
    const value = Number(stats[key] ?? 0)
    const bar = document.createElement('div')
    bar.className = 'bar'
    const label = document.createElement('span')
    label.textContent = key.toUpperCase()
    const track = document.createElement('div')
    track.className = 'bar-track'
    const fill = document.createElement('div')
    fill.className = 'bar-fill'
    fill.style.width = `${Math.min(CONFIG_EDITOR_PREVIEW.STAT_BAR_MAX_VALUE, value)}%`
    const number = document.createElement('span')
    number.textContent = String(value)
    track.append(fill)
    bar.append(label, track, number)
    bars.append(bar)
  }
  return bars
}

function isMapData(value: unknown): value is MapData {
  return isRecordObject(value)
    && typeof value.id === 'string'
    && typeof value.width === 'number'
    && typeof value.height === 'number'
    && Array.isArray(value.layers)
}

function isSpriteCropConfig(value: unknown): value is SpriteCropConfig {
  return isRecordObject(value) && typeof value.key === 'string'
}

function renderSpriteEditor(assetKey: string, path: string): void {
  const summary = document.createElement('div')
  summary.className = 'summary sprite-editor'

  const metrics = document.createElement('div')
  metrics.className = 'metric-grid'
  appendMetric(metrics, 'Key', assetKey)
  appendMetric(metrics, '文件', path ? path.split('/').pop() ?? path : '未配置')
  appendMetric(metrics, '切图', GAME_CONFIG_DATABASE.getTable('spriteCrops')[assetKey] ? '已配置' : '默认')
  summary.append(metrics)

  if (!path) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = '图片资产未配置路径'
    summary.append(empty)
    elements.previewBody.append(summary)
    return
  }

  const draft = getSpriteCropDraft(assetKey)
  const image = new Image()
  const canvas = document.createElement('canvas')
  canvas.width = CONFIG_EDITOR_SPRITE.PREVIEW_CANVAS_WIDTH
  canvas.height = CONFIG_EDITOR_SPRITE.PREVIEW_CANVAS_HEIGHT
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = CONFIG_EDITOR_SPRITE.OUTPUT_CANVAS_SIZE
  outputCanvas.height = CONFIG_EDITOR_SPRITE.OUTPUT_CANVAS_SIZE
  let viewport: SpriteViewport = {
    scale: SPRITE_CROP_DEFAULTS.MIN_SIZE,
    offsetX: CONFIG_EDITOR_SPRITE.CANVAS_PADDING,
    offsetY: CONFIG_EDITOR_SPRITE.CANVAS_PADDING,
    width: SPRITE_CROP_DEFAULTS.SOURCE_WIDTH,
    height: SPRITE_CROP_DEFAULTS.SOURCE_HEIGHT,
  }
  let dragMode: SpriteDragMode = null
  let dragOffset: { x: number; y: number } = { x: SPRITE_CROP_DEFAULTS.SOURCE_X, y: SPRITE_CROP_DEFAULTS.SOURCE_Y }

  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'sprite-canvas-wrap'
  canvasWrap.append(canvas)

  const controls = document.createElement('div')
  controls.className = 'sprite-controls'
  const fields = document.createElement('div')
  fields.className = 'sprite-field-grid'
  const fieldInputs = new Map<SpriteCropField, HTMLInputElement>()
  for (const field of SPRITE_CROP_FIELDS) {
    const label = document.createElement('label')
    label.className = 'sprite-field'
    const span = document.createElement('span')
    span.textContent = field.label
    const input = document.createElement('input')
    input.type = 'number'
    input.step = String(CONFIG_EDITOR_SPRITE.NUMBER_INPUT_STEP)
    input.value = String(draft[field.key])
    input.addEventListener('input', () => {
      draft[field.key] = Number(input.value)
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
        syncSpriteCropInputs(fieldInputs, draft)
        viewport = drawSpriteCropCanvases(canvas, outputCanvas, image, draft)
      }
    })
    label.append(span, input)
    fields.append(label)
    fieldInputs.set(field.key, input)
  }

  const outputWrap = document.createElement('div')
  outputWrap.className = 'sprite-output'
  const outputTitle = document.createElement('span')
  outputTitle.textContent = '输出预览'
  outputWrap.append(outputTitle, outputCanvas)

  const actions = document.createElement('div')
  actions.className = 'sprite-actions'
  const resetButton = document.createElement('button')
  resetButton.type = 'button'
  resetButton.textContent = '重置为整图'
  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.className = 'primary'
  saveButton.textContent = '保存切图'
  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.className = 'danger'
  deleteButton.textContent = '删除切图'
  deleteButton.disabled = !GAME_CONFIG_DATABASE.getTable('spriteCrops')[assetKey]
  actions.append(resetButton, saveButton, deleteButton)

  controls.append(fields, outputWrap, actions)
  const layout = document.createElement('div')
  layout.className = 'sprite-editor-layout'
  layout.append(canvasWrap, controls)
  summary.append(layout)

  const details = document.createElement('div')
  details.className = 'detail-list'
  appendDetail(details, '路径', `/sprites/${path}`)
  summary.append(details)
  elements.previewBody.append(summary)

  resetButton.addEventListener('click', () => {
    resetSpriteCropDraft(draft, assetKey, image.naturalWidth, image.naturalHeight)
    syncSpriteCropInputs(fieldInputs, draft)
    viewport = drawSpriteCropCanvases(canvas, outputCanvas, image, draft)
  })

  saveButton.addEventListener('click', () => {
    clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
    GAME_CONFIG_DATABASE.setRecord('spriteCrops', assetKey, cloneConfigData(draft))
    deleteButton.disabled = false
    renderTables()
    if (state.activeTable === 'spriteCrops') renderRecords()
    setStatus('切图参数已保存。', 'ok')
  })

  deleteButton.addEventListener('click', () => {
    GAME_CONFIG_DATABASE.deleteRecord('spriteCrops', assetKey)
    deleteButton.disabled = true
    if (state.activeTable === 'spriteCrops') {
      state.selectedId = ''
      renderAll()
    } else {
      resetSpriteCropDraft(draft, assetKey, image.naturalWidth, image.naturalHeight)
      syncSpriteCropInputs(fieldInputs, draft)
      viewport = drawSpriteCropCanvases(canvas, outputCanvas, image, draft)
      renderTables()
    }
    setStatus('切图参数已删除。', 'ok')
  })

  canvas.addEventListener('pointerdown', event => {
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return
    const point = getSpriteImagePoint(event, canvas, viewport)
    if (!point) return
    canvas.setPointerCapture(event.pointerId)
    if (isSpriteHandleHit(point, draft, viewport)) {
      dragMode = 'resize'
    } else if (isSpriteCropHit(point, draft)) {
      dragMode = 'move'
      dragOffset = { x: point.x - draft.sourceX, y: point.y - draft.sourceY }
    } else {
      draft.sourceX = point.x
      draft.sourceY = point.y
      dragMode = 'resize'
    }
    clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
    syncSpriteCropInputs(fieldInputs, draft)
    viewport = drawSpriteCropCanvases(canvas, outputCanvas, image, draft)
  })

  canvas.addEventListener('pointermove', event => {
    if (!dragMode) return
    const point = getSpriteImagePoint(event, canvas, viewport)
    if (!point) return
    if (dragMode === 'move') {
      draft.sourceX = point.x - dragOffset.x
      draft.sourceY = point.y - dragOffset.y
    } else {
      draft.sourceWidth = point.x - draft.sourceX
      draft.sourceHeight = point.y - draft.sourceY
    }
    clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
    syncSpriteCropInputs(fieldInputs, draft)
    viewport = drawSpriteCropCanvases(canvas, outputCanvas, image, draft)
  })

  const stopDrag = (): void => {
    dragMode = null
  }
  canvas.addEventListener('pointerup', stopDrag)
  canvas.addEventListener('pointerleave', stopDrag)

  image.addEventListener('load', () => {
    if (!GAME_CONFIG_DATABASE.getTable('spriteCrops')[assetKey]) {
      resetSpriteCropDraft(draft, assetKey, image.naturalWidth, image.naturalHeight)
    }
    clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
    syncSpriteCropInputs(fieldInputs, draft)
    viewport = drawSpriteCropCanvases(canvas, outputCanvas, image, draft)
  })
  image.addEventListener('error', () => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = CONFIG_EDITOR_SPRITE.BACKGROUND_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = CONFIG_EDITOR_FALLBACK_COLORS.warning
    ctx.fillText(CONFIG_EDITOR_SPRITE.IMAGE_LOAD_ERROR, CONFIG_EDITOR_SPRITE.CANVAS_PADDING, CONFIG_EDITOR_SPRITE.CANVAS_PADDING * 2)
  })
  image.src = `/sprites/${path}`
}

function getSpriteCropDraft(key: string): SpriteCropConfig {
  const crop = GAME_CONFIG_DATABASE.getTable('spriteCrops')[key] as Partial<SpriteCropConfig> | undefined
  return {
    key,
    sourceX: finiteNumber(crop?.sourceX, SPRITE_CROP_DEFAULTS.SOURCE_X),
    sourceY: finiteNumber(crop?.sourceY, SPRITE_CROP_DEFAULTS.SOURCE_Y),
    sourceWidth: finiteNumber(crop?.sourceWidth, SPRITE_CROP_DEFAULTS.SOURCE_WIDTH),
    sourceHeight: finiteNumber(crop?.sourceHeight, SPRITE_CROP_DEFAULTS.SOURCE_HEIGHT),
    outputWidth: finiteNumber(crop?.outputWidth, SPRITE_CROP_DEFAULTS.OUTPUT_WIDTH),
    outputHeight: finiteNumber(crop?.outputHeight, SPRITE_CROP_DEFAULTS.OUTPUT_HEIGHT),
    offsetX: finiteNumber(crop?.offsetX, SPRITE_CROP_DEFAULTS.OFFSET_X),
    offsetY: finiteNumber(crop?.offsetY, SPRITE_CROP_DEFAULTS.OFFSET_Y),
  }
}

function resetSpriteCropDraft(draft: SpriteCropConfig, key: string, sourceWidth: number, sourceHeight: number): void {
  draft.key = key
  draft.sourceX = SPRITE_CROP_DEFAULTS.SOURCE_X
  draft.sourceY = SPRITE_CROP_DEFAULTS.SOURCE_Y
  draft.sourceWidth = sourceWidth || SPRITE_CROP_DEFAULTS.SOURCE_WIDTH
  draft.sourceHeight = sourceHeight || SPRITE_CROP_DEFAULTS.SOURCE_HEIGHT
  draft.outputWidth = SPRITE_CROP_DEFAULTS.OUTPUT_WIDTH
  draft.outputHeight = SPRITE_CROP_DEFAULTS.OUTPUT_HEIGHT
  draft.offsetX = SPRITE_CROP_DEFAULTS.OFFSET_X
  draft.offsetY = SPRITE_CROP_DEFAULTS.OFFSET_Y
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clampSpriteCropDraft(draft: SpriteCropConfig, sourceWidth: number, sourceHeight: number): void {
  const minSize = SPRITE_CROP_DEFAULTS.MIN_SIZE
  const maxSourceX = Math.max(SPRITE_CROP_DEFAULTS.SOURCE_X, sourceWidth - minSize)
  const maxSourceY = Math.max(SPRITE_CROP_DEFAULTS.SOURCE_Y, sourceHeight - minSize)
  draft.sourceX = clamp(Math.round(finiteNumber(draft.sourceX, SPRITE_CROP_DEFAULTS.SOURCE_X)), SPRITE_CROP_DEFAULTS.SOURCE_X, maxSourceX)
  draft.sourceY = clamp(Math.round(finiteNumber(draft.sourceY, SPRITE_CROP_DEFAULTS.SOURCE_Y)), SPRITE_CROP_DEFAULTS.SOURCE_Y, maxSourceY)
  draft.sourceWidth = clamp(Math.round(finiteNumber(draft.sourceWidth, SPRITE_CROP_DEFAULTS.SOURCE_WIDTH)), minSize, Math.max(minSize, sourceWidth - draft.sourceX))
  draft.sourceHeight = clamp(Math.round(finiteNumber(draft.sourceHeight, SPRITE_CROP_DEFAULTS.SOURCE_HEIGHT)), minSize, Math.max(minSize, sourceHeight - draft.sourceY))
  draft.outputWidth = clamp(Math.round(finiteNumber(draft.outputWidth, SPRITE_CROP_DEFAULTS.OUTPUT_WIDTH)), minSize, SPRITE_CROP_DEFAULTS.MAX_OUTPUT_SIZE)
  draft.outputHeight = clamp(Math.round(finiteNumber(draft.outputHeight, SPRITE_CROP_DEFAULTS.OUTPUT_HEIGHT)), minSize, SPRITE_CROP_DEFAULTS.MAX_OUTPUT_SIZE)
  draft.offsetX = clamp(Math.round(finiteNumber(draft.offsetX, SPRITE_CROP_DEFAULTS.OFFSET_X)), -draft.outputWidth, draft.outputWidth)
  draft.offsetY = clamp(Math.round(finiteNumber(draft.offsetY, SPRITE_CROP_DEFAULTS.OFFSET_Y)), -draft.outputHeight, draft.outputHeight)
}

function syncSpriteCropInputs(inputs: Map<SpriteCropField, HTMLInputElement>, draft: SpriteCropConfig): void {
  for (const [key, input] of inputs) input.value = String(draft[key])
}

function drawSpriteCropCanvases(canvas: HTMLCanvasElement, outputCanvas: HTMLCanvasElement, image: HTMLImageElement, draft: SpriteCropConfig): SpriteViewport {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.warn(`Failed to draw sprite crop preview ${draft.key}`)
    return getSpriteViewport(canvas, image)
  }
  const viewport = getSpriteViewport(canvas, image)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = CONFIG_EDITOR_SPRITE.BACKGROUND_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = CONFIG_EDITOR_SPRITE.GRID_COLOR
  ctx.strokeRect(viewport.offsetX, viewport.offsetY, viewport.width, viewport.height)
  ctx.drawImage(image, viewport.offsetX, viewport.offsetY, viewport.width, viewport.height)
  const rect = getSpriteCanvasRect(draft, viewport)
  ctx.fillStyle = CONFIG_EDITOR_SPRITE.CROP_FILL_COLOR
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  ctx.strokeStyle = CONFIG_EDITOR_SPRITE.CROP_STROKE_COLOR
  ctx.lineWidth = CONFIG_EDITOR_SPRITE.NUMBER_INPUT_STEP
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  ctx.fillStyle = CONFIG_EDITOR_SPRITE.HANDLE_COLOR
  ctx.fillRect(rect.x + rect.width - CONFIG_EDITOR_SPRITE.HANDLE_SIZE / 2, rect.y + rect.height - CONFIG_EDITOR_SPRITE.HANDLE_SIZE / 2, CONFIG_EDITOR_SPRITE.HANDLE_SIZE, CONFIG_EDITOR_SPRITE.HANDLE_SIZE)
  drawSpriteOutput(outputCanvas, image, draft)
  return viewport
}

function drawSpriteOutput(canvas: HTMLCanvasElement, image: HTMLImageElement, draft: SpriteCropConfig): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const padding = CONFIG_EDITOR_SPRITE.CANVAS_PADDING
  const scale = Math.min((canvas.width - padding * 2) / draft.outputWidth, (canvas.height - padding * 2) / draft.outputHeight)
  const width = draft.outputWidth * scale
  const height = draft.outputHeight * scale
  const x = (canvas.width - width) / 2
  const y = (canvas.height - height) / 2
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = CONFIG_EDITOR_SPRITE.OUTPUT_BACKGROUND_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.drawImage(image, draft.sourceX, draft.sourceY, draft.sourceWidth, draft.sourceHeight, x + draft.offsetX * scale, y + draft.offsetY * scale, draft.sourceWidth * scale, draft.sourceHeight * scale)
  ctx.restore()
  ctx.strokeStyle = CONFIG_EDITOR_SPRITE.IMAGE_BORDER_COLOR
  ctx.strokeRect(x, y, width, height)
}

function getSpriteViewport(canvas: HTMLCanvasElement, image: HTMLImageElement): SpriteViewport {
  const padding = CONFIG_EDITOR_SPRITE.CANVAS_PADDING
  const imageWidth = image.naturalWidth || SPRITE_CROP_DEFAULTS.SOURCE_WIDTH
  const imageHeight = image.naturalHeight || SPRITE_CROP_DEFAULTS.SOURCE_HEIGHT
  const scale = Math.min((canvas.width - padding * 2) / imageWidth, (canvas.height - padding * 2) / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    scale,
    offsetX: (canvas.width - width) / 2,
    offsetY: (canvas.height - height) / 2,
    width,
    height,
  }
}

function getSpriteCanvasRect(draft: SpriteCropConfig, viewport: SpriteViewport): { x: number; y: number; width: number; height: number } {
  return {
    x: viewport.offsetX + draft.sourceX * viewport.scale,
    y: viewport.offsetY + draft.sourceY * viewport.scale,
    width: draft.sourceWidth * viewport.scale,
    height: draft.sourceHeight * viewport.scale,
  }
}

function getSpriteImagePoint(event: PointerEvent, canvas: HTMLCanvasElement, viewport: SpriteViewport): { x: number; y: number } | null {
  const bounds = canvas.getBoundingClientRect()
  const x = (event.clientX - bounds.left) * (canvas.width / bounds.width)
  const y = (event.clientY - bounds.top) * (canvas.height / bounds.height)
  if (x < viewport.offsetX || x > viewport.offsetX + viewport.width || y < viewport.offsetY || y > viewport.offsetY + viewport.height) return null
  return {
    x: Math.round((x - viewport.offsetX) / viewport.scale),
    y: Math.round((y - viewport.offsetY) / viewport.scale),
  }
}

function isSpriteCropHit(point: { x: number; y: number }, draft: SpriteCropConfig): boolean {
  return point.x >= draft.sourceX
    && point.x <= draft.sourceX + draft.sourceWidth
    && point.y >= draft.sourceY
    && point.y <= draft.sourceY + draft.sourceHeight
}

function isSpriteHandleHit(point: { x: number; y: number }, draft: SpriteCropConfig, viewport: SpriteViewport): boolean {
  const handleSize = CONFIG_EDITOR_SPRITE.HANDLE_SIZE / viewport.scale
  const handleX = draft.sourceX + draft.sourceWidth
  const handleY = draft.sourceY + draft.sourceHeight
  return Math.abs(point.x - handleX) <= handleSize && Math.abs(point.y - handleY) <= handleSize
}

function renderMapPreview(map: MapData): void {
  const summary = document.createElement('div')
  summary.className = 'summary'
  const metrics = document.createElement('div')
  metrics.className = 'metric-grid'
  appendMetric(metrics, '尺寸', `${map.width}x${map.height}`)
  appendMetric(metrics, '事件', String(map.events.length))
  appendMetric(metrics, '碰撞', String(map.collisions.length))
  summary.append(metrics)

  const wrap = document.createElement('div')
  wrap.className = 'map-wrap'
  const canvas = document.createElement('canvas')
  canvas.width = CONFIG_EDITOR_PREVIEW.MAP_CANVAS_WIDTH
  canvas.height = CONFIG_EDITOR_PREVIEW.MAP_CANVAS_HEIGHT
  drawMap(canvas, map)
  wrap.append(canvas)
  summary.append(wrap)

  const details = document.createElement('div')
  details.className = 'detail-list'
  appendDetail(details, '名称', map.name)
  appendDetail(details, 'BGM', map.bgm ?? GAME_CONFIG_DATABASE.getTable('mapBgm')[map.id] ?? '')
  appendDetail(details, '连接', map.connections.map(connection => connection.targetMap).join(', '))
  appendDetail(details, '战斗', (map.encounters ?? []).join(', '))
  summary.append(details)
  elements.previewBody.append(summary)
}

function drawMap(canvas: HTMLCanvasElement, map: MapData): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.warn(`Failed to render map preview ${map.id}`)
    return
  }
  ctx.fillStyle = CONFIG_EDITOR_FALLBACK_COLORS.mapBackground
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const tileSize = clamp(
    Math.floor(Math.min(canvas.width / map.width, canvas.height / map.height)),
    CONFIG_EDITOR_PREVIEW.MAP_TILE_MIN_SIZE,
    CONFIG_EDITOR_PREVIEW.MAP_TILE_MAX_SIZE,
  )
  const offsetX = Math.floor((canvas.width - map.width * tileSize) / 2)
  const offsetY = Math.floor((canvas.height - map.height * tileSize) / 2)
  const tileSprites = GAME_CONFIG_DATABASE.getTable('tileSprites')

  drawLayer(ctx, map, MAP_LAYER_INDEX.GROUND, tileSize, offsetX, offsetY, tileSprites)
  drawLayer(ctx, map, MAP_LAYER_INDEX.OBJECTS, tileSize, offsetX, offsetY, tileSprites)
  drawEvents(ctx, map.events, tileSize, offsetX, offsetY)
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  layerIndex: number,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  tileSprites: Record<number, string>,
): void {
  const layer = map.layers[layerIndex]
  if (!layer) return
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tileId = layer.data[y * map.width + x] ?? 0
      if (tileId <= 0 && layerIndex !== MAP_LAYER_INDEX.GROUND) continue
      const spriteKey = tileSprites[tileId] ?? ''
      ctx.fillStyle = CONFIG_EDITOR_TILE_COLORS[spriteKey] ?? (layerIndex === MAP_LAYER_INDEX.GROUND ? CONFIG_EDITOR_FALLBACK_COLORS.mapUnknownTile : CONFIG_EDITOR_FALLBACK_COLORS.mapObject)
      ctx.globalAlpha = layerIndex === MAP_LAYER_INDEX.GROUND ? 1 : 0.82
      ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize)
    }
  }
  ctx.globalAlpha = 1
}

function drawEvents(ctx: CanvasRenderingContext2D, events: MapEvent[], tileSize: number, offsetX: number, offsetY: number): void {
  for (const event of events) {
    ctx.fillStyle = CONFIG_EDITOR_EVENT_COLORS[event.type] ?? CONFIG_EDITOR_FALLBACK_COLORS.warning
    ctx.globalAlpha = 0.84
    ctx.fillRect(offsetX + event.x * tileSize, offsetY + event.y * tileSize, event.width * tileSize, event.height * tileSize)
  }
  ctx.globalAlpha = 1
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
