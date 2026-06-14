import 'phaser'
import { CaskTownGame } from './game'
import { STARTUP_LOADING } from './utils/constants'

let gameInstance: CaskTownGame | null = null
let startupFallbackTimer: number | undefined

function hideStartupLoading(): void {
  if (startupFallbackTimer !== undefined) {
    window.clearTimeout(startupFallbackTimer)
    startupFallbackTimer = undefined
  }
  document.getElementById(STARTUP_LOADING.ELEMENT_ID)?.remove()
}

window.addEventListener(STARTUP_LOADING.READY_EVENT, hideStartupLoading, { once: true })

function scheduleStartupLoadingFallback(): void {
  if (!document.getElementById(STARTUP_LOADING.ELEMENT_ID)) return
  startupFallbackTimer = window.setTimeout(() => {
    console.warn('Startup loading fallback elapsed before ready event')
    hideStartupLoading()
  }, STARTUP_LOADING.FALLBACK_HIDE_DELAY_MS)
}

function startGame(): void {
  if (gameInstance) return
  gameInstance = new CaskTownGame()
  scheduleStartupLoadingFallback()
}

if (document.readyState === 'loading') {
  window.addEventListener('load', startGame, { once: true })
} else {
  startGame()
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'F5') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('game-quicksave'))
  }
  if (e.key === 'F9') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('game-quickload'))
  }
})
