import './styles.css'
import {
  GAME_CONFIG_DATABASE,
  GAME_CONFIG_TABLE_KEYS,
  cloneConfigData,
  type GameConfigTableKey,
} from '../data/configDatabase'
import {
  CONFIG_EDITOR_API,
  CONFIG_EDITOR_CHARACTER_IMAGE_KEYS,
  CONFIG_EDITOR_EVENT_COLORS,
  CONFIG_EDITOR_FALLBACK_COLORS,
  CONFIG_EDITOR_HIDDEN_TABLE_KEYS,
  CONFIG_EDITOR_ID_FALLBACK_PREFIX,
  CONFIG_EDITOR_JSON_INDENT,
  CONFIG_EDITOR_PREVIEW,
  CONFIG_EDITOR_RESOURCE_GROUP_LABELS,
  CONFIG_EDITOR_RESOURCE_TREE,
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
type ReferenceTableKey = Exclude<GameConfigTableKey, 'prophecies' | 'tileSprites' | 'mapBgm' | 'spriteCrops'>

interface SpriteFrame {
  x: number
  y: number
  w: number
  h: number
}

interface SpriteFrameSource {
  available: boolean
  category?: string
  frame?: SpriteFrame
  frameName?: string
  image?: string
  imageUrl?: string
  json?: string
  message?: string
}

interface ResourceTreeNode {
  children: Map<string, ResourceTreeNode>
  count: number
  entries: RecordEntry[]
  key: string
}

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
        <div class="section-head"><h2>编辑</h2><span id="selected-pill" class="pill"></span></div>
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
  const visibleTableKeys = GAME_CONFIG_TABLE_KEYS.filter(key => !isHiddenTableKey(key))
  elements.tableTotal.textContent = `${visibleTableKeys.length}`
  for (const key of visibleTableKeys) {
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
  if (state.activeTable === 'imageAssets') {
    renderResourceRecords(entries)
    renderSelected(entries.find(entry => entry.id === state.selectedId) ?? entries[0] ?? null)
    return
  }
  for (const entry of entries) {
    elements.recordList.append(createRecordButton(entry))
  }
  renderSelected(entries.find(entry => entry.id === state.selectedId) ?? entries[0] ?? null)
}

function renderResourceRecords(entries: RecordEntry[]): void {
  const rootNode = createResourceTreeNode('')
  for (const entry of entries) {
    appendResourceTreeEntry(rootNode, getResourceTreeSegments(entry), entry)
  }
  for (const node of sortResourceTreeNodes(rootNode.children.values())) {
    elements.recordList.append(renderResourceTreeNode(node, 0))
  }
}

function createResourceTreeNode(key: string): ResourceTreeNode {
  return { children: new Map(), count: 0, entries: [], key }
}

function appendResourceTreeEntry(node: ResourceTreeNode, segments: string[], entry: RecordEntry): void {
  node.count += 1
  if (segments.length === 0) {
    node.entries.push(entry)
    return
  }
  const head = segments[0]
  if (!head) {
    node.entries.push(entry)
    return
  }
  const tail = segments.slice(1)
  const child = node.children.get(head) ?? createResourceTreeNode(head)
  node.children.set(head, child)
  appendResourceTreeEntry(child, tail, entry)
}

function renderResourceTreeNode(node: ResourceTreeNode, depth: number): HTMLElement {
  const group = document.createElement('details')
  group.className = `resource-group depth-${depth}`
  group.open = depth < CONFIG_EDITOR_RESOURCE_TREE.DEFAULT_OPEN_DEPTH
  const summary = document.createElement('summary')
  summary.className = 'resource-group-title'
  const label = document.createElement('span')
  label.textContent = getResourceTreeLabel(node.key)
  const count = document.createElement('span')
  count.className = 'count'
  count.textContent = String(node.count)
  summary.append(label, count)
  group.append(summary)
  for (const child of sortResourceTreeNodes(node.children.values())) group.append(renderResourceTreeNode(child, depth + 1))
  for (const entry of node.entries) group.append(createRecordButton(entry))
  return group
}

function sortResourceTreeNodes(nodes: Iterable<ResourceTreeNode>): ResourceTreeNode[] {
  return Array.from(nodes).sort((a, b) => getResourceTreeLabel(a.key).localeCompare(getResourceTreeLabel(b.key)))
}

function isHiddenTableKey(key: GameConfigTableKey): boolean {
  return CONFIG_EDITOR_HIDDEN_TABLE_KEYS.some(hiddenKey => hiddenKey === key)
}

function createRecordButton(entry: RecordEntry): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.recordId = entry.id
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
    selectRecord(entry)
  })
  return button
}

function selectRecord(entry: RecordEntry): void {
  state.selectedId = entry.id
  if (state.activeTable !== 'imageAssets') {
    renderRecords()
    return
  }
  for (const button of elements.recordList.querySelectorAll<HTMLButtonElement>('.record-button')) {
    button.classList.toggle('active', button.dataset.recordId === entry.id)
  }
  renderSelected(entry)
}

function getResourceTreeSegments(entry: RecordEntry): string[] {
  const path = typeof entry.value === 'string' ? entry.value : ''
  const segments = path.split('/').filter(Boolean)
  if (entry.id.startsWith('ui_')) return ['ui', getUiResourceGroupKey(entry.id)]
  if (segments.length > 1) return segments.slice(0, -1)
  return ['uncategorized', 'misc']
}

function getUiResourceGroupKey(id: string): string {
  return id.includes('bg') ? 'backgrounds' : 'misc'
}

function getResourceTreeLabel(key: string): string {
  return CONFIG_EDITOR_RESOURCE_GROUP_LABELS[key] ?? key
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
    if (state.activeTable === 'maps' && isMapData(parsed)) {
      GAME_CONFIG_DATABASE.setRecord('mapBgm', nextId, parsed.bgm)
    }
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
    empty.textContent = '选择记录后开始编辑'
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
  if ((state.activeTable === 'bgmTracks' || state.activeTable === 'sfxTracks') && isRecordObject(entry.value)) {
    renderAudioRecordEditor(entry)
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
  renderImagePreviews(summary, getRecordImageAssetKeys(state.activeTable, entry.id, entry.value))
  if (isRecordObject(entry.value)) renderObjectEditor(summary, entry.value)
  else appendPrimitiveEditor(summary, entry.value)
  elements.previewBody.append(summary)
}

function renderAudioRecordEditor(entry: RecordEntry): void {
  if (!isRecordObject(entry.value)) return
  const summary = document.createElement('div')
  summary.className = 'summary'
  const metrics = document.createElement('div')
  metrics.className = 'metric-grid'
  appendMetric(metrics, 'ID', entry.id)
  appendMetric(metrics, '类型', state.activeTable === 'bgmTracks' ? '音乐' : '音效')
  appendMetric(metrics, '字段', String(Object.keys(entry.value).length))
  summary.append(metrics)
  renderAudioPreview(summary, entry.id, entry.value)
  renderObjectEditor(summary, entry.value)
  elements.previewBody.append(summary)
}

function renderObjectEditor(container: HTMLElement, value: Record<string, unknown>): void {
  const draft = cloneConfigData(value)
  if (isStatsCarrier(draft)) container.append(renderStatBars(draft.stats))
  const fields = document.createElement('div')
  fields.className = 'editor-form'
  for (const key of Object.keys(draft)) {
    fields.append(createEditorField(key, draft[key], nextValue => {
      draft[key] = nextValue
      syncEditorDraft(draft)
    }))
  }
  container.append(fields)
}

function appendPrimitiveEditor(container: HTMLElement, value: unknown): void {
  const fields = document.createElement('div')
  fields.className = 'editor-form'
  fields.append(createEditorField('value', value, nextValue => syncEditorDraft(nextValue)))
  container.append(fields)
}

function createEditorField(labelText: string, value: unknown, onChange: (value: unknown) => void): HTMLElement {
  if (isRecordObject(value)) return createObjectField(labelText, value, onChange)
  if (Array.isArray(value)) return createArrayField(labelText, value, onChange)

  const label = document.createElement('label')
  label.className = 'editor-field'
  const caption = document.createElement('span')
  caption.textContent = labelText
  const referenceTable = getReferenceTableForField(labelText)
  if (referenceTable) {
    label.append(caption, createReferenceSelect(referenceTable, typeof value === 'string' ? value : '', next => onChange(next || null), true))
    return label
  }
  if (typeof value === 'boolean') {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = value
    input.addEventListener('change', () => onChange(input.checked))
    label.append(caption, input)
    return label
  }
  if (typeof value === 'number') {
    const input = document.createElement('input')
    input.type = 'number'
    input.value = String(value)
    input.addEventListener('input', () => onChange(finiteNumber(Number(input.value), value)))
    label.append(caption, input)
    return label
  }
  const input = String(value ?? '').length > CONFIG_EDITOR_PREVIEW.VALIDATION_PREVIEW_LENGTH
    ? document.createElement('textarea')
    : document.createElement('input')
  if (input instanceof HTMLInputElement) input.type = 'text'
  input.value = String(value ?? '')
  input.addEventListener('input', () => onChange(input.value))
  label.append(caption, input)
  return label
}

function createObjectField(labelText: string, value: Record<string, unknown>, onChange: (value: unknown) => void): HTMLElement {
  const fieldset = document.createElement('fieldset')
  fieldset.className = 'editor-fieldset'
  const legend = document.createElement('legend')
  legend.textContent = labelText
  fieldset.append(legend)
  const draft = cloneConfigData(value)
  for (const key of Object.keys(draft)) {
    fieldset.append(createEditorField(key, draft[key], nextValue => {
      draft[key] = nextValue
      onChange(draft)
    }))
  }
  return fieldset
}

function createArrayField(labelText: string, value: unknown[], onChange: (value: unknown) => void): HTMLElement {
  const referenceTable = getReferenceTableForField(labelText)
  if (referenceTable && value.every(item => typeof item === 'string')) {
    const label = document.createElement('label')
    label.className = 'editor-field'
    const caption = document.createElement('span')
    caption.textContent = labelText
    const select = createReferenceSelect(referenceTable, value as string[], next => onChange(next), false)
    label.append(caption, select)
    return label
  }

  const label = document.createElement('label')
  label.className = 'editor-field'
  const caption = document.createElement('span')
  caption.textContent = labelText
  const textarea = document.createElement('textarea')
  textarea.value = stringify(value)
  textarea.addEventListener('input', () => {
    try {
      onChange(JSON.parse(textarea.value) as unknown[])
      textarea.classList.remove('invalid')
    } catch {
      textarea.classList.add('invalid')
    }
  })
  label.append(caption, textarea)
  return label
}

function createReferenceSelect(
  tableKey: ReferenceTableKey,
  selected: string | string[],
  onChange: (value: string | string[]) => void,
  allowEmpty: boolean,
): HTMLSelectElement {
  const select = document.createElement('select')
  const selectedValues = new Set(Array.isArray(selected) ? selected : [selected].filter(Boolean))
  select.multiple = Array.isArray(selected)
  if (allowEmpty) {
    const empty = document.createElement('option')
    empty.value = ''
    empty.textContent = '未选择'
    select.append(empty)
  }
  const options = getReferenceOptions(tableKey)
  for (const option of options) {
    const item = document.createElement('option')
    item.value = option.id
    item.textContent = option.label
    item.selected = selectedValues.has(option.id)
    select.append(item)
  }
  for (const value of selectedValues) {
    if (options.some(option => option.id === value)) continue
    const item = document.createElement('option')
    item.value = value
    item.textContent = `${value} · 未在配置表中找到`
    item.selected = true
    select.append(item)
  }
  select.addEventListener('change', () => {
    if (select.multiple) {
      onChange(Array.from(select.selectedOptions).map(option => option.value))
      return
    }
    onChange(select.value)
  })
  return select
}

function getReferenceOptions(tableKey: ReferenceTableKey): { id: string; label: string }[] {
  return getTableEntries(tableKey)
    .map(entry => ({ id: entry.id, label: entry.label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function getReferenceTableForField(fieldKey: string): ReferenceTableKey | null {
  if (fieldKey === 'skills') return 'skills'
  if (fieldKey === 'weapon' || fieldKey === 'armor' || fieldKey === 'accessory' || fieldKey === 'itemId') return 'items'
  if (fieldKey === 'enemies') return 'enemies'
  if (fieldKey === 'encounters' || fieldKey === 'encounterId') return 'encounters'
  if (fieldKey === 'background' || fieldKey === 'sprite') return 'imageAssets'
  if (fieldKey === 'bgm') return 'bgmTracks'
  if (fieldKey === 'dialogueId') return 'dialogues'
  if (fieldKey === 'questId') return 'quests'
  if (fieldKey === 'targetMap') return 'maps'
  if (fieldKey === 'characterId') return 'characters'
  return null
}

function syncEditorDraft(value: unknown): void {
  elements.jsonEditor.value = stringify(value)
  validateEditor()
}

function renderImagePreviews(container: HTMLElement, assetKeys: string[]): void {
  const imageAssets = GAME_CONFIG_DATABASE.getTable('imageAssets')
  const uniqueKeys = Array.from(new Set(assetKeys)).filter(key => imageAssets[key])
  if (uniqueKeys.length === 0) return
  const grid = document.createElement('div')
  grid.className = 'asset-preview-grid'
  for (const key of uniqueKeys) {
    const card = document.createElement('div')
    card.className = 'asset-preview-card'
    const image = document.createElement('img')
    image.alt = key
    image.src = `/sprites/${imageAssets[key]}`
    const label = document.createElement('span')
    label.textContent = key
    card.append(image, label)
    grid.append(card)
  }
  container.append(grid)
}

function getRecordImageAssetKeys(tableKey: GameConfigTableKey, id: string, value: unknown): string[] {
  const imageAssets = GAME_CONFIG_DATABASE.getTable('imageAssets')
  if (tableKey === 'imageAssets') return [id]
  if (tableKey === 'characters') {
    return [
      CONFIG_EDITOR_CHARACTER_IMAGE_KEYS[id] ?? '',
      `${id.toLowerCase()}_front_idle_01`,
    ].filter(key => Boolean(key && imageAssets[key]))
  }
  if (tableKey === 'enemies') {
    return [`mon_${id}_01`, `npc_${id}`].filter(key => Boolean(imageAssets[key]))
  }
  if (tableKey === 'items') {
    return [`item_${id}`, `obj_${id}`, `env_${id}`, id].filter(key => Boolean(imageAssets[key]))
  }
  if (isRecordObject(value) && typeof value.sprite === 'string') return [value.sprite]
  return []
}

function renderAudioPreview(container: HTMLElement, id: string, value: Record<string, unknown>): void {
  if (typeof value.path !== 'string') return
  const panel = document.createElement('div')
  panel.className = 'audio-preview'
  const title = document.createElement('span')
  title.textContent = id
  const audio = document.createElement('audio')
  audio.controls = true
  audio.preload = 'none'
  audio.src = `/${value.path}`
  panel.append(title, audio)
  container.append(panel)
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
  appendMetric(metrics, '图块', getTileSpriteIds(assetKey).join(', ') || '未绑定')
  summary.append(metrics)

  renderImagePreviews(summary, [assetKey])

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
  let source: SpriteFrameSource | null = null

  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'sprite-canvas-wrap'
  canvasWrap.append(canvas)

  const controls = document.createElement('div')
  controls.className = 'sprite-controls'
  const sourceStatus = document.createElement('div')
  sourceStatus.className = 'sprite-source-status'
  sourceStatus.textContent = '正在读取源图集配置'
  const fields = document.createElement('div')
  fields.className = 'sprite-field-grid'
  const fieldInputs = new Map<SpriteCropField, HTMLInputElement>()
  for (const field of SPRITE_CROP_FIELDS.filter(field => field.key.startsWith('source'))) {
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
      draft.outputWidth = draft.sourceWidth
      draft.outputHeight = draft.sourceHeight
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
  outputTitle.textContent = '切图预览'
  outputWrap.append(outputTitle, outputCanvas)

  const tileBindings = renderTileBindings(assetKey)
  const actions = document.createElement('div')
  actions.className = 'sprite-actions'
  const resetButton = document.createElement('button')
  resetButton.type = 'button'
  resetButton.textContent = '重载源配置'
  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.className = 'primary'
  saveButton.textContent = '保存并刷新'
  saveButton.disabled = true
  actions.append(resetButton, saveButton)

  controls.append(sourceStatus, fields, outputWrap, tileBindings, actions)
  const layout = document.createElement('div')
  layout.className = 'sprite-editor-layout'
  layout.append(canvasWrap, controls)
  summary.append(layout)

  const details = document.createElement('div')
  details.className = 'detail-list'
  appendDetail(details, '运行时路径', `/sprites/${path}`)
  summary.append(details)
  elements.previewBody.append(summary)

  const applySource = (nextSource: SpriteFrameSource): void => {
    source = nextSource
    if (!source.available || !source.frame || !source.imageUrl) {
      sourceStatus.textContent = source.message ?? '当前资源没有源图集配置'
      saveButton.disabled = true
      image.src = `/sprites/${path}`
      return
    }
    setDraftFromSpriteFrame(draft, assetKey, source.frame)
    syncSpriteCropInputs(fieldInputs, draft)
    sourceStatus.textContent = `${source.json ?? ''} · ${source.frameName ?? ''}`
    saveButton.disabled = false
    image.src = `${source.imageUrl}&v=${Date.now()}`
  }

  const reloadSource = (): void => {
    loadSpriteFrameSource(path)
      .then(applySource)
      .catch(error => {
        console.warn('Failed to load sprite atlas source', error)
        sourceStatus.textContent = '源图集接口不可用，当前仅能预览运行时图片'
        saveButton.disabled = true
        image.src = `/sprites/${path}`
      })
  }

  resetButton.addEventListener('click', reloadSource)

  saveButton.addEventListener('click', () => {
    if (!source?.available || !source.frame) {
      setStatus('当前资源没有可写入的源图集配置。', 'error')
      return
    }
    clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
    saveButton.disabled = true
    saveSpriteFrameSource(path, draft)
      .then(result => {
        setStatus(result.message ?? '源切图已保存并刷新。', 'ok')
        reloadSource()
      })
      .catch(error => {
        console.error('Failed to save sprite atlas frame', error)
        setStatus(error instanceof Error ? error.message : '保存源切图失败。', 'error')
      })
      .finally(() => {
        saveButton.disabled = false
      })
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
    if (!source?.available) {
      resetSpriteCropDraft(draft, assetKey, image.naturalWidth, image.naturalHeight)
    }
    clampSpriteCropDraft(draft, image.naturalWidth, image.naturalHeight)
    draft.outputWidth = draft.sourceWidth
    draft.outputHeight = draft.sourceHeight
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
  reloadSource()
}

function getTileSpriteIds(assetKey: string): string[] {
  return Object.entries(GAME_CONFIG_DATABASE.getTable('tileSprites'))
    .filter(([, spriteKey]) => spriteKey === assetKey)
    .map(([tileId]) => tileId)
}

function renderTileBindings(assetKey: string): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'tile-bindings'
  const title = document.createElement('span')
  title.textContent = '图块引用'
  wrapper.append(title)
  const tileIds = getTileSpriteIds(assetKey)
  if (tileIds.length === 0) {
    const empty = document.createElement('span')
    empty.className = 'muted'
    empty.textContent = '未绑定到图块 ID'
    wrapper.append(empty)
    return wrapper
  }
  for (const tileId of tileIds) {
    const chip = document.createElement('span')
    chip.className = 'chip'
    chip.textContent = tileId
    wrapper.append(chip)
  }
  return wrapper
}

function setDraftFromSpriteFrame(draft: SpriteCropConfig, key: string, frame: SpriteFrame): void {
  draft.key = key
  draft.sourceX = frame.x
  draft.sourceY = frame.y
  draft.sourceWidth = frame.w
  draft.sourceHeight = frame.h
  draft.outputWidth = frame.w
  draft.outputHeight = frame.h
  draft.offsetX = SPRITE_CROP_DEFAULTS.OFFSET_X
  draft.offsetY = SPRITE_CROP_DEFAULTS.OFFSET_Y
}

async function loadSpriteFrameSource(path: string): Promise<SpriteFrameSource> {
  const url = `${CONFIG_EDITOR_API.BASE_PATH}/${CONFIG_EDITOR_API.SPRITE_FRAME_PATH}?path=${encodeURIComponent(path)}`
  const response = await fetch(url)
  if (!response.ok) return { available: false, message: '源图集接口不可用' }
  return await response.json() as SpriteFrameSource
}

async function saveSpriteFrameSource(path: string, draft: SpriteCropConfig): Promise<{ message?: string }> {
  const response = await fetch(`${CONFIG_EDITOR_API.BASE_PATH}/${CONFIG_EDITOR_API.SPRITE_FRAME_PATH}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path,
      frame: {
        x: draft.sourceX,
        y: draft.sourceY,
        w: draft.sourceWidth,
        h: draft.sourceHeight,
      },
    }),
  })
  const result = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(result.message ?? 'Failed to save sprite atlas frame')
  return result
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
  const draft = cloneConfigData(map)
  const summary = document.createElement('div')
  summary.className = 'summary'
  const metrics = document.createElement('div')
  metrics.className = 'metric-grid'
  appendMetric(metrics, '尺寸', `${draft.width}x${draft.height}`)
  appendMetric(metrics, '事件', String(draft.events.length))
  appendMetric(metrics, '碰撞', String(draft.collisions.length))
  summary.append(metrics)

  const wrap = document.createElement('div')
  wrap.className = 'map-wrap'
  const canvas = document.createElement('canvas')
  canvas.width = CONFIG_EDITOR_PREVIEW.MAP_CANVAS_WIDTH
  canvas.height = CONFIG_EDITOR_PREVIEW.MAP_CANVAS_HEIGHT
  drawMap(canvas, draft)
  wrap.append(canvas)
  summary.append(wrap)

  const fields = document.createElement('div')
  fields.className = 'editor-form'
  fields.append(createEditorField('name', draft.name, value => {
    draft.name = String(value ?? '')
    syncEditorDraft(draft)
  }))
  fields.append(createEditorField('bgm', draft.bgm, value => {
    draft.bgm = String(value ?? '')
    syncEditorDraft(draft)
    audioPanel.replaceChildren()
    const config = GAME_CONFIG_DATABASE.getTable('bgmTracks')[draft.bgm]
    if (config) renderAudioPreview(audioPanel, draft.bgm, config as unknown as Record<string, unknown>)
  }))
  fields.append(createEditorField('encounters', draft.encounters ?? [], value => {
    draft.encounters = Array.isArray(value) ? value.map(String) : []
    syncEditorDraft(draft)
  }))
  summary.append(fields)

  const audioPanel = document.createElement('div')
  const bgmConfig = GAME_CONFIG_DATABASE.getTable('bgmTracks')[draft.bgm]
  if (bgmConfig) renderAudioPreview(audioPanel, draft.bgm, bgmConfig as unknown as Record<string, unknown>)
  summary.append(audioPanel)

  const details = document.createElement('div')
  details.className = 'detail-list'
  appendDetail(details, '图块集', draft.tileset)
  appendDetail(details, '连接', draft.connections.map(connection => connection.targetMap).join(', '))
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
