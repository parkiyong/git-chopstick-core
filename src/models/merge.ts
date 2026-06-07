export type MergeTreeResult = {
  readonly sha: string
  readonly tree: string
  readonly conflicted: boolean
  readonly mergeBase: string
}
