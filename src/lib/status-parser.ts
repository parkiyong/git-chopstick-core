import {
  FileEntry,
  GitStatusEntry,
  SubmoduleStatus,
  UnmergedEntrySummary,
} from '../models/status.js'
import { splitBuffer } from './split-buffer.js'

type StatusItem = IStatusHeader | IStatusEntry

export interface IStatusHeader {
  readonly kind: 'header'
  readonly value: string
}

export interface IStatusEntry {
  readonly kind: 'entry'
  readonly path: string
  readonly statusCode: string
  readonly submoduleStatusCode: string
  readonly oldPath?: string
  readonly renameOrCopyScore?: number
}

export function isStatusHeader(
  statusItem: StatusItem
): statusItem is IStatusHeader {
  return statusItem.kind === 'header'
}

export function isStatusEntry(
  statusItem: StatusItem
): statusItem is IStatusEntry {
  return statusItem.kind === 'entry'
}

const ChangedEntryType = '1'
const RenamedOrCopiedEntryType = '2'
const UnmergedEntryType = 'u'
const UntrackedEntryType = '?'

const changedEntryRe =
  /^1 ([MADRCUTX?!.]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([\s\S]*?)$/

const renamedOrCopiedEntryRe =
  /^2 ([MADRCUTX?!.]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([RC]\d+) ([\s\S]*?)$/

const unmergedEntryRe =
  /^u ([DAU]{2}) (N\.\.\.|S[C.][M.][U.]) (\d+) (\d+) (\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([a-f0-9]+) ([\s\S]*?)$/

export function parsePorcelainStatus(
  output: Buffer
): ReadonlyArray<StatusItem> {
  const entries = new Array<StatusItem>()
  const tokens = splitBuffer(output, '\0')

  for (let i = 0; i < tokens.length; i++) {
    const field = tokens[i].toString()
    if (field.startsWith('# ') && field.length > 2) {
      entries.push({ kind: 'header', value: field.substring(2) })
      continue
    }

    const entryKind = field.substring(0, 1)

    if (entryKind === ChangedEntryType) {
      entries.push(parseChangedEntry(field))
    } else if (entryKind === RenamedOrCopiedEntryType) {
      entries.push(parsedRenamedOrCopiedEntry(field, tokens[++i].toString()))
    } else if (entryKind === UnmergedEntryType) {
      entries.push(parseUnmergedEntry(field))
    } else if (entryKind === UntrackedEntryType) {
      entries.push(parseUntrackedEntry(field))
    }
  }

  return entries
}

function parseChangedEntry(field: string): IStatusEntry {
  const match = changedEntryRe.exec(field)
  if (!match) throw new Error(`Failed to parse status line for changed entry`)
  return {
    kind: 'entry',
    statusCode: match[1],
    submoduleStatusCode: match[2],
    path: match[8],
  }
}

function parsedRenamedOrCopiedEntry(
  field: string,
  oldPath: string | undefined
): IStatusEntry {
  const match = renamedOrCopiedEntryRe.exec(field)
  if (!match) throw new Error(`Failed to parse status line for renamed or copied entry`)
  if (!oldPath) throw new Error('Failed to parse renamed or copied entry, could not parse old path')

  return {
    kind: 'entry',
    statusCode: match[1],
    submoduleStatusCode: match[2],
    oldPath,
    renameOrCopyScore: parseInt(match[8].substring(1), 10),
    path: match[9],
  }
}

function parseUnmergedEntry(field: string): IStatusEntry {
  const match = unmergedEntryRe.exec(field)
  if (!match) throw new Error(`Failed to parse status line for unmerged entry`)
  return {
    kind: 'entry',
    statusCode: match[1],
    submoduleStatusCode: match[2],
    path: match[10],
  }
}

function parseUntrackedEntry(field: string): IStatusEntry {
  const path = field.substring(2)
  return {
    kind: 'entry',
    statusCode: '??',
    submoduleStatusCode: '????',
    path,
  }
}

function mapSubmoduleStatus(
  submoduleStatusCode: string
): SubmoduleStatus | undefined {
  if (!submoduleStatusCode.startsWith('S')) return undefined
  return {
    commitChanged: submoduleStatusCode[1] === 'C',
    modifiedChanges: submoduleStatusCode[2] === 'M',
    untrackedChanges: submoduleStatusCode[3] === 'U',
  }
}

export function mapStatus(
  statusCode: string,
  submoduleStatusCode: string,
  renameOrCopyScore: number | undefined
): FileEntry {
  const submoduleStatus = mapSubmoduleStatus(submoduleStatusCode)

  if (statusCode === '??') return { kind: 'untracked', submoduleStatus }

  const pairs: Record<string, () => FileEntry> = {
    '.M': () => ({ kind: 'ordinary', type: 'modified', index: GitStatusEntry.Unchanged, workingTree: GitStatusEntry.Modified, submoduleStatus }),
    'M.': () => ({ kind: 'ordinary', type: 'modified', index: GitStatusEntry.Modified, workingTree: GitStatusEntry.Unchanged, submoduleStatus }),
    '.A': () => ({ kind: 'ordinary', type: 'added', index: GitStatusEntry.Unchanged, workingTree: GitStatusEntry.Added, submoduleStatus }),
    'A.': () => ({ kind: 'ordinary', type: 'added', index: GitStatusEntry.Added, workingTree: GitStatusEntry.Unchanged, submoduleStatus }),
    '.D': () => ({ kind: 'ordinary', type: 'deleted', index: GitStatusEntry.Unchanged, workingTree: GitStatusEntry.Deleted, submoduleStatus }),
    'D.': () => ({ kind: 'ordinary', type: 'deleted', index: GitStatusEntry.Deleted, workingTree: GitStatusEntry.Unchanged, submoduleStatus }),
    'R.': () => ({ kind: 'renamed' as const, index: GitStatusEntry.Renamed, workingTree: GitStatusEntry.Unchanged, renameOrCopyScore, submoduleStatus }),
    '.R': () => ({ kind: 'renamed' as const, index: GitStatusEntry.Unchanged, workingTree: GitStatusEntry.Renamed, renameOrCopyScore, submoduleStatus }),
    'C.': () => ({ kind: 'copied' as const, index: GitStatusEntry.Copied, workingTree: GitStatusEntry.Unchanged, submoduleStatus }),
    '.C': () => ({ kind: 'copied' as const, index: GitStatusEntry.Unchanged, workingTree: GitStatusEntry.Copied, submoduleStatus }),
    'AD': () => ({ kind: 'ordinary', type: 'added', index: GitStatusEntry.Added, workingTree: GitStatusEntry.Deleted, submoduleStatus }),
    'AM': () => ({ kind: 'ordinary', type: 'added', index: GitStatusEntry.Added, workingTree: GitStatusEntry.Modified, submoduleStatus }),
    'RM': () => ({ kind: 'renamed' as const, index: GitStatusEntry.Renamed, workingTree: GitStatusEntry.Modified, renameOrCopyScore, submoduleStatus }),
    'RD': () => ({ kind: 'renamed' as const, index: GitStatusEntry.Renamed, workingTree: GitStatusEntry.Deleted, renameOrCopyScore, submoduleStatus }),
    'DD': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.BothDeleted, us: GitStatusEntry.Deleted, them: GitStatusEntry.Deleted, submoduleStatus }),
    'AU': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.AddedByUs, us: GitStatusEntry.Added, them: GitStatusEntry.UpdatedButUnmerged, submoduleStatus }),
    'UD': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.DeletedByThem, us: GitStatusEntry.UpdatedButUnmerged, them: GitStatusEntry.Deleted, submoduleStatus }),
    'UA': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.AddedByThem, us: GitStatusEntry.UpdatedButUnmerged, them: GitStatusEntry.Added, submoduleStatus }),
    'DU': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.DeletedByUs, us: GitStatusEntry.Deleted, them: GitStatusEntry.UpdatedButUnmerged, submoduleStatus }),
    'AA': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.BothAdded, us: GitStatusEntry.Added, them: GitStatusEntry.Added, submoduleStatus }),
    'UU': () => ({ kind: 'conflicted' as const, action: UnmergedEntrySummary.BothModified, us: GitStatusEntry.UpdatedButUnmerged, them: GitStatusEntry.UpdatedButUnmerged, submoduleStatus }),
  }

  return pairs[statusCode]?.() ?? { kind: 'ordinary', type: 'modified', submoduleStatus }
}
