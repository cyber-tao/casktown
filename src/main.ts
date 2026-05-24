import 'phaser'
import { CaskTownGame } from './game'
import { STARTUP_LOADING } from './utils/constants'

let gameInstance: CaskTownGame | null = null

function hideStartupLoading(): void {
  document.getElementById(STARTUP_LOADING.ELEMENT_ID)?.remove()
}

window.addEventListener(STARTUP_LOADING.READY_EVENT, hideStartupLoading, { once: true })

function startGame(): void {
  if (gameInstance) return
  gameInstance = new CaskTownGame()
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
