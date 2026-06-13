import { CommittedFileChange } from './status.js'

export interface IStashEntry {
  readonly name: string
  readonly branchName: string
  readonly stashSha: string
  readonly files: StashedFileChanges
  readonly tree: string
  readonly parents: ReadonlyArray<string>
}

export enum StashedChangesLoadStates {
  NotLoaded = 'NotLoaded',
  Loading = 'Loading',
  Loaded = 'Loaded',
}

export type StashedFileChanges =
  | {
      readonly kind: StashedChangesLoadStates.NotLoaded | StashedChangesLoadStates.Loading
    }
  | {
      readonly kind: StashedChangesLoadStates.Loaded
      readonly files: ReadonlyArray<CommittedFileChange>
    }
