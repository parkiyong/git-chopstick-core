import { DiffSelection, DiffSelectionType } from './diff'

export enum GitStatusEntry {
  Modified = 'M',
  Added = 'A',
  Deleted = 'D',
  Renamed = 'R',
  Copied = 'C',
  Unchanged = '.',
  Untracked = '?',
  Ignored = '!',
  UpdatedButUnmerged = 'U',
}

export enum AppFileStatusKind {
  New = 'New',
  Modified = 'Modified',
  Deleted = 'Deleted',
  Copied = 'Copied',
  Renamed = 'Renamed',
  Conflicted = 'Conflicted',
  Untracked = 'Untracked',
}

export type PlainFileStatus = {
  kind: AppFileStatusKind.New | AppFileStatusKind.Modified | AppFileStatusKind.Deleted
  submoduleStatus?: SubmoduleStatus
}

export type CopiedOrRenamedFileStatus = {
  kind: AppFileStatusKind.Copied | AppFileStatusKind.Renamed
  oldPath: string
  renameIncludesModifications: boolean
  submoduleStatus?: SubmoduleStatus
}

export type ConflictsWithMarkers = {
  kind: AppFileStatusKind.Conflicted
  entry: TextConflictEntry
  conflictMarkerCount: number
  submoduleStatus?: SubmoduleStatus
}

export type ManualConflict = {
  kind: AppFileStatusKind.Conflicted
  entry: ManualConflictEntry
  submoduleStatus?: SubmoduleStatus
}

export type ConflictedFileStatus = ConflictsWithMarkers | ManualConflict

export function isConflictedFileStatus(
  appFileStatus: AppFileStatus
): appFileStatus is ConflictedFileStatus {
  return appFileStatus.kind === AppFileStatusKind.Conflicted
}

export function isConflictWithMarkers(
  conflictedFileStatus: ConflictedFileStatus
): conflictedFileStatus is ConflictsWithMarkers {
  return 'conflictMarkerCount' in conflictedFileStatus
}

export type UntrackedFileStatus = {
  kind: AppFileStatusKind.Untracked
  submoduleStatus?: SubmoduleStatus
}

export type AppFileStatus =
  | PlainFileStatus
  | CopiedOrRenamedFileStatus
  | ConflictedFileStatus
  | UntrackedFileStatus

export type SubmoduleStatus = {
  readonly commitChanged: boolean
  readonly modifiedChanges: boolean
  readonly untrackedChanges: boolean
}

type OrdinaryEntry = {
  readonly kind: 'ordinary'
  readonly type: 'added' | 'modified' | 'deleted'
  readonly index?: GitStatusEntry
  readonly workingTree?: GitStatusEntry
  readonly submoduleStatus?: SubmoduleStatus
}

type RenamedOrCopiedEntry = {
  readonly kind: 'renamed' | 'copied'
  readonly index?: GitStatusEntry
  readonly workingTree?: GitStatusEntry
  readonly submoduleStatus?: SubmoduleStatus
  readonly renameOrCopyScore?: number
}

export enum UnmergedEntrySummary {
  AddedByUs = 'added-by-us',
  DeletedByUs = 'deleted-by-us',
  AddedByThem = 'added-by-them',
  DeletedByThem = 'deleted-by-them',
  BothDeleted = 'both-deleted',
  BothAdded = 'both-added',
  BothModified = 'both-modified',
}

type TextConflictDetails =
  | {
      readonly action: UnmergedEntrySummary.BothAdded
      readonly us: GitStatusEntry.Added
      readonly them: GitStatusEntry.Added
    }
  | {
      readonly action: UnmergedEntrySummary.BothModified
      readonly us: GitStatusEntry.UpdatedButUnmerged
      readonly them: GitStatusEntry.UpdatedButUnmerged
    }

type TextConflictEntry = {
  readonly kind: 'conflicted'
  readonly submoduleStatus?: SubmoduleStatus
} & TextConflictDetails

type ManualConflictDetails = {
  readonly submoduleStatus?: SubmoduleStatus
} & (
  | { readonly action: UnmergedEntrySummary.BothAdded; readonly us: GitStatusEntry.Added; readonly them: GitStatusEntry.Added }
  | { readonly action: UnmergedEntrySummary.BothModified; readonly us: GitStatusEntry.UpdatedButUnmerged; readonly them: GitStatusEntry.UpdatedButUnmerged }
  | { readonly action: UnmergedEntrySummary.AddedByUs; readonly us: GitStatusEntry.Added; readonly them: GitStatusEntry.UpdatedButUnmerged }
  | { readonly action: UnmergedEntrySummary.DeletedByThem; readonly us: GitStatusEntry.UpdatedButUnmerged; readonly them: GitStatusEntry.Deleted }
  | { readonly action: UnmergedEntrySummary.AddedByThem; readonly us: GitStatusEntry.UpdatedButUnmerged; readonly them: GitStatusEntry.Added }
  | { readonly action: UnmergedEntrySummary.DeletedByUs; readonly us: GitStatusEntry.Deleted; readonly them: GitStatusEntry.UpdatedButUnmerged }
  | { readonly action: UnmergedEntrySummary.BothDeleted; readonly us: GitStatusEntry.Deleted; readonly them: GitStatusEntry.Deleted }
)

type ManualConflictEntry = {
  readonly kind: 'conflicted'
  readonly submoduleStatus?: SubmoduleStatus
} & ManualConflictDetails

export type UnmergedEntry = TextConflictEntry | ManualConflictEntry

type UntrackedEntry = {
  readonly kind: 'untracked'
  readonly submoduleStatus?: SubmoduleStatus
}

export type FileEntry =
  | OrdinaryEntry
  | RenamedOrCopiedEntry
  | UnmergedEntry
  | UntrackedEntry

export class FileChange {
  public readonly id: string

  public constructor(
    public readonly path: string,
    public readonly status: AppFileStatus
  ) {
    if (
      status.kind === AppFileStatusKind.Renamed ||
      status.kind === AppFileStatusKind.Copied
    ) {
      this.id = `${status.kind}+${path}+${status.oldPath}`
    } else {
      this.id = `${status.kind}+${path}`
    }
  }

  public isDeleted(): boolean {
    return this.status.kind === AppFileStatusKind.Deleted
  }

  public isNew(): boolean {
    return this.status.kind === AppFileStatusKind.New
  }

  public isModified(): boolean {
    return this.status.kind === AppFileStatusKind.Modified
  }

  public isUntracked(): boolean {
    return this.status.kind === AppFileStatusKind.Untracked
  }
}

export class WorkingDirectoryFileChange extends FileChange {
  public constructor(
    path: string,
    status: AppFileStatus,
    public readonly selection: DiffSelection
  ) {
    super(path, status)
  }

  public withIncludeAll(include: boolean): WorkingDirectoryFileChange {
    const newSelection = include
      ? this.selection.withSelectAll()
      : this.selection.withSelectNone()
    return this.withSelection(newSelection)
  }

  public withSelection(selection: DiffSelection): WorkingDirectoryFileChange {
    return new WorkingDirectoryFileChange(this.path, this.status, selection)
  }

  public isIncludedInCommit(): boolean {
    return this.selection.getSelectionType() === DiffSelectionType.All
  }

  public isExcludedFromCommit(): boolean {
    return this.selection.getSelectionType() === DiffSelectionType.None
  }
}

export class CommittedFileChange extends FileChange {
  public constructor(
    path: string,
    status: AppFileStatus,
    public readonly commitish: string,
    public readonly parentCommitish: string
  ) {
    super(path, status)
  }
}

export class WorkingDirectoryStatus {
  public static fromFiles(
    files: ReadonlyArray<WorkingDirectoryFileChange>
  ): WorkingDirectoryStatus {
    return new WorkingDirectoryStatus(files, getIncludeAllState(files))
  }

  private readonly fileIxById = new Map<string, number>()

  private constructor(
    public readonly files: ReadonlyArray<WorkingDirectoryFileChange>,
    public readonly includeAll: boolean | null = true
  ) {
    files.forEach((f, ix) => this.fileIxById.set(f.id, ix))
  }

  public withIncludeAllFiles(includeAll: boolean): WorkingDirectoryStatus {
    const newFiles = this.files.map(f => f.withIncludeAll(includeAll))
    return new WorkingDirectoryStatus(newFiles, includeAll)
  }

  public findFileWithID(id: string): WorkingDirectoryFileChange | null {
    const ix = this.fileIxById.get(id)
    return ix !== undefined ? this.files[ix] || null : null
  }

  public findFileIndexByID(id: string): number {
    const ix = this.fileIxById.get(id)
    return ix !== undefined ? ix : -1
  }
}

function getIncludeAllState(
  files: ReadonlyArray<WorkingDirectoryFileChange>
): boolean | null {
  if (!files.length) return true

  const allSelected = files.every(
    f => f.selection.getSelectionType() === DiffSelectionType.All
  )
  const noneSelected = files.every(
    f => f.selection.getSelectionType() === DiffSelectionType.None
  )

  if (allSelected) return true
  if (noneSelected) return false
  return null
}
