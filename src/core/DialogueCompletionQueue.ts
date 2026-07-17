import type { DialogueData, EventAction } from '../data/types'

export function getUniqueEventActions(actions: readonly EventAction[]): EventAction[] {
  const uniqueActions: EventAction[] = []
  const seen = new Set<string>()
  for (const action of actions) {
    const key = JSON.stringify(action)
    if (seen.has(key)) continue
    seen.add(key)
    uniqueActions.push(action)
  }
  return uniqueActions
}

export class DialogueCompletionQueue {
  private readonly actions: EventAction[] = []
  private readonly completedDialogueIds = new Set<string>()
  private readonly terminalParentScripts: DialogueData[] = []
  private finalized = false

  deferTerminalParent(script: DialogueData): void {
    if (this.finalized) return
    this.terminalParentScripts.push(script)
  }

  completeScript(script: DialogueData | undefined): void {
    if (this.finalized) return
    if (!script?.onComplete?.length || this.completedDialogueIds.has(script.id)) return
    this.completedDialogueIds.add(script.id)
    this.actions.push(...script.onComplete)
  }

  finalize(): EventAction[] {
    if (this.finalized) return []
    while (this.terminalParentScripts.length > 0) {
      this.completeScript(this.terminalParentScripts.pop())
    }
    const actions = getUniqueEventActions(this.actions)
    this.actions.length = 0
    this.finalized = true
    return actions
  }
}
