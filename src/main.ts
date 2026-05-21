import 'phaser'
import { CaskTownGame } from './game'

function startGame(): void {
  if ((window as any).game) return
  const game = new CaskTownGame()
  ;(window as any).game = game
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
