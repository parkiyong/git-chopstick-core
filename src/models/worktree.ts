export type WorktreeType = 'main' | 'linked'

export type WorktreeEntry = {
  readonly path: string
  readonly head: string
  readonly branch: string | null
  readonly isDetached: boolean
  readonly type: WorktreeType
  readonly isLocked: boolean
  readonly isPrunable: boolean
}
