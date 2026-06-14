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

  deferTerminalParent(script: DialogueData): void {
    this.terminalParentScripts.push(script)
  }

  completeScript(script: DialogueData | undefined): void {
    if (!script?.onComplete?.length || this.completedDialogueIds.has(script.id)) return
    this.completedDialogueIds.add(script.id)
    this.actions.push(...script.onComplete)
  }

  finalize(): EventAction[] {
    while (this.terminalParentScripts.length > 0) {
      this.completeScript(this.terminalParentScripts.pop())
    }
    return getUniqueEventActions(this.actions)
  }
}
