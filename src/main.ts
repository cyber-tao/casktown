import 'phaser'
import { CaskTownGame } from './game'

window.addEventListener('load', () => {
  const game = new CaskTownGame()
  ;(window as any).game = game
})

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
