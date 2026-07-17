export interface SaveLoadTransitionState {
  active: boolean
}

export function completeLoadedSaveTransition(
  state: SaveLoadTransitionState,
  emitLoaded: () => void,
  stopMenu: () => void,
): boolean {
  if (state.active) return false
  state.active = true
  try {
    emitLoaded()
  } finally {
    stopMenu()
  }
  return true
}
