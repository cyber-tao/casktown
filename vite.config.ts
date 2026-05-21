import { defineConfig } from 'vite'
import { spawn } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { cp, readFile, writeFile } from 'node:fs/promises'
import path from 'path'

const defaultBasePath = '/'
const basePath = process.env.VITE_BASE_PATH || defaultBasePath
const editorApiPrefix = '/__casktown-editor'
const spriteFrameRoute = '/sprite-frame'
const spriteAtlasImageRoute = '/sprite-atlas-image'
const sourceSpritePackDir = path.resolve(__dirname, 'img/sprites')
const sourceSpriteManifestPath = path.resolve(sourceSpritePackDir, 'pack_manifest.json')
const staticSpriteSourceOutputDir = 'sprite-sources'
const refreshSpriteScriptPath = 'scripts/refresh-sprites.ts'
const utf8Encoding = 'utf8'
const posixSeparator = '/'
const pngExtension = '.png'
const miscOutputDirectory = 'misc'
const rootFrameSegmentCount = 1
const successStatusCode = 200
const badRequestStatusCode = 400
const notFoundStatusCode = 404
const methodNotAllowedStatusCode = 405
const internalErrorStatusCode = 500
const phaserVendorChunkName = 'phaser-vendor'
const vendorChunkName = 'vendor'
const phaserVendorPattern = /node_modules[\\/]phaser[\\/]/
const nodeModulesPattern = /node_modules[\\/]/
const knownFrameworkChunkWarningLimitKb = 1400

interface SpritePackManifest {
  files: SpritePackFile[]
}

interface SpritePackFile {
  image: string
  json: string
  category: string
}

interface SpriteAtlasMetadata {
  frames: Record<string, SpriteFrameMetadata>
}

interface SpriteFrameMetadata {
  frame: SpriteFrame
  rotated?: boolean
  trimmed?: boolean
  spriteSourceSize?: SpriteFrame
  sourceSize?: { w: number; h: number }
}

interface SpriteFrame {
  x: number
  y: number
  w: number
  h: number
}

interface SpriteFrameMatch {
  atlas: SpriteAtlasMetadata
  frameName: string
  metadata: SpriteFrameMetadata
  packFile: SpritePackFile
  sourceJsonPath: string
}

interface SaveSpriteFramePayload {
  path?: unknown
  frame?: Partial<SpriteFrame>
}

function normalizeAssetPath(value: string): string {
  return value.replaceAll('\\', posixSeparator).replace(/^\/+/, '')
}

function resolveInside(basePath: string, ...segments: string[]): string {
  const resolvedBasePath = path.resolve(basePath)
  const resolvedPath = path.resolve(resolvedBasePath, ...segments)
  const basePathWithSeparator = resolvedBasePath.endsWith(path.sep) ? resolvedBasePath : `${resolvedBasePath}${path.sep}`
  if (resolvedPath !== resolvedBasePath && !resolvedPath.startsWith(basePathWithSeparator)) {
    throw new Error(`Path escapes base directory: ${resolvedPath}`)
  }
  return resolvedPath
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, utf8Encoding)) as T
}

async function readSpriteManifest(): Promise<SpritePackManifest> {
  return await readJsonFile<SpritePackManifest>(sourceSpriteManifestPath)
}

function getSpriteOutputPath(category: string, frameName: string): string {
  const frameSegments = frameName.split(posixSeparator).filter(Boolean)
  const outputSegments = [category]
  if (frameSegments.length === rootFrameSegmentCount) outputSegments.push(miscOutputDirectory)
  outputSegments.push(...frameSegments)
  const fileName = outputSegments.pop()
  if (!fileName) throw new Error(`Invalid frame name: ${frameName}`)
  outputSegments.push(fileName.endsWith(pngExtension) ? fileName : `${fileName}${pngExtension}`)
  return outputSegments.join(posixSeparator)
}

async function findSpriteFrameByOutputPath(outputPath: string): Promise<SpriteFrameMatch | null> {
  const manifest = await readSpriteManifest()
  const normalizedOutputPath = normalizeAssetPath(outputPath)
  for (const packFile of manifest.files) {
    const sourceJsonPath = resolveInside(sourceSpritePackDir, packFile.json)
    const atlas = await readJsonFile<SpriteAtlasMetadata>(sourceJsonPath)
    for (const [frameName, metadata] of Object.entries(atlas.frames)) {
      if (getSpriteOutputPath(packFile.category, frameName) !== normalizedOutputPath) continue
      return { atlas, frameName, metadata, packFile, sourceJsonPath }
    }
  }
  return null
}

function sendJson(res: ServerResponse, statusCode: number, value: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(value))
}

async function readRequestJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString(utf8Encoding)) as T
}

function isValidFrame(frame: Partial<SpriteFrame> | undefined): frame is SpriteFrame {
  return Boolean(frame)
    && Number.isInteger(frame.x)
    && Number.isInteger(frame.y)
    && Number.isInteger(frame.w)
    && Number.isInteger(frame.h)
    && frame.x! >= 0
    && frame.y! >= 0
    && frame.w! > 0
    && frame.h! > 0
}

function updateFrameMetadata(metadata: SpriteFrameMetadata, frame: SpriteFrame): void {
  metadata.frame = frame
  metadata.rotated = false
  if (metadata.spriteSourceSize) {
    metadata.spriteSourceSize = { x: 0, y: 0, w: frame.w, h: frame.h }
  }
  if (metadata.sourceSize) {
    metadata.sourceSize = { w: frame.w, h: frame.h }
  }
}

async function runSpriteRefresh(): Promise<string> {
  const bunVersion = (process.versions as NodeJS.ProcessVersions & { bun?: string }).bun
  const command = bunVersion ? process.execPath : 'bun'
  const child = spawn(command, ['run', refreshSpriteScriptPath], {
    cwd: __dirname,
    shell: process.platform === 'win32' && !bunVersion,
  })
  const outputChunks: string[] = []
  child.stdout.on('data', chunk => outputChunks.push(String(chunk)))
  child.stderr.on('data', chunk => outputChunks.push(String(chunk)))
  const exitCode = await new Promise<number | null>(resolve => child.on('close', resolve))
  const output = outputChunks.join('').trim()
  if (exitCode !== 0) {
    throw new Error(output || `Sprite refresh failed with exit code ${exitCode}`)
  }
  return output
}

async function handleGetSpriteFrame(url: URL, res: ServerResponse): Promise<void> {
  const outputPath = url.searchParams.get('path')
  if (!outputPath) {
    sendJson(res, badRequestStatusCode, { available: false, message: 'Missing sprite path' })
    return
  }
  const match = await findSpriteFrameByOutputPath(outputPath)
  if (!match) {
    sendJson(res, successStatusCode, { available: false, message: 'Source atlas frame not found' })
    return
  }
  sendJson(res, successStatusCode, {
    available: true,
    category: match.packFile.category,
    frame: match.metadata.frame,
    frameName: match.frameName,
    image: match.packFile.image,
    imageUrl: `${editorApiPrefix}${spriteAtlasImageRoute}?image=${encodeURIComponent(match.packFile.image)}`,
    json: match.packFile.json,
  })
}

async function handleSaveSpriteFrame(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const payload = await readRequestJson<SaveSpriteFramePayload>(req)
  if (typeof payload.path !== 'string' || !isValidFrame(payload.frame)) {
    sendJson(res, badRequestStatusCode, { message: 'Invalid sprite frame payload' })
    return
  }
  const match = await findSpriteFrameByOutputPath(payload.path)
  if (!match) {
    sendJson(res, notFoundStatusCode, { message: 'Source atlas frame not found' })
    return
  }
  updateFrameMetadata(match.metadata, payload.frame)
  await writeFile(match.sourceJsonPath, `${JSON.stringify(match.atlas, null, 2)}\n`, utf8Encoding)
  await runSpriteRefresh()
  sendJson(res, successStatusCode, { message: '源切图已保存并刷新 assets/sprites。' })
}

async function handleSpriteAtlasImage(url: URL, res: ServerResponse): Promise<void> {
  const image = url.searchParams.get('image')
  const manifest = await readSpriteManifest()
  if (!image || !manifest.files.some(file => file.image === image)) {
    sendJson(res, notFoundStatusCode, { message: 'Source atlas image not found' })
    return
  }
  const imagePath = resolveInside(sourceSpritePackDir, image)
  const data = await readFile(imagePath)
  res.statusCode = successStatusCode
  res.setHeader('Content-Type', 'image/png')
  res.end(data)
}

function casktownEditorApiPlugin() {
  return {
    name: 'casktown-editor-api',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(editorApiPrefix)) {
          next()
          return
        }
        const url = new URL(req.url, 'http://localhost')
        const route = url.pathname.slice(editorApiPrefix.length)
        Promise.resolve()
          .then(async () => {
            if (route === spriteFrameRoute && req.method === 'GET') {
              await handleGetSpriteFrame(url, res)
              return
            }
            if (route === spriteFrameRoute && req.method === 'PUT') {
              await handleSaveSpriteFrame(req, res)
              return
            }
            if (route === spriteAtlasImageRoute && req.method === 'GET') {
              await handleSpriteAtlasImage(url, res)
              return
            }
            sendJson(res, methodNotAllowedStatusCode, { message: 'Unsupported editor API route' })
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error)
            sendJson(res, internalErrorStatusCode, { message })
          })
      })
    },
  }
}

function casktownStaticSpriteSourcePlugin() {
  return {
    name: 'casktown-static-sprite-source',
    apply: 'build' as const,
    async closeBundle() {
      await cp(sourceSpritePackDir, path.resolve(__dirname, 'dist', staticSpriteSourceOutputDir), { recursive: true })
    },
  }
}

export default defineConfig({
  root: '.',
  base: basePath,
  plugins: [casktownEditorApiPlugin(), casktownStaticSpriteSourcePlugin()],
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: knownFrameworkChunkWarningLimitKb,
    rolldownOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        editor: path.resolve(__dirname, 'editor.html'),
      },
      output: {
        codeSplitting: {
          groups: [
            { name: phaserVendorChunkName, test: phaserVendorPattern, priority: 20 },
            { name: vendorChunkName, test: nodeModulesPattern, priority: 10 },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'assets'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
