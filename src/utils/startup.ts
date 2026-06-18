import { STARTUP_LOADING } from './constants'

export function isStartupReady(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute(STARTUP_LOADING.READY_ATTRIBUTE) === STARTUP_LOADING.READY_VALUE
}

export function markStartupReady(): void {
  if (isStartupReady()) return

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(STARTUP_LOADING.READY_ATTRIBUTE, STARTUP_LOADING.READY_VALUE)
  }

  if (typeof window === 'undefined') return
  const event = typeof CustomEvent === 'function'
    ? new CustomEvent(STARTUP_LOADING.READY_EVENT)
    : new Event(STARTUP_LOADING.READY_EVENT)
  window.dispatchEvent(event)
}
