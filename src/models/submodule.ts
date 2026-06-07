export type SubmoduleEntry = {
  readonly path: string
  readonly url: string
  readonly describe?: string
  readonly sha: string
  readonly status: SubmoduleStatus
}

export type SubmoduleStatus = {
  readonly commitChanged: boolean
  readonly modifiedChanges: boolean
  readonly untrackedChanges: boolean
}
