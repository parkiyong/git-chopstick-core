import { DiffHunk } from './raw-diff.js'
import { Image } from './image.js'
import { SubmoduleStatus } from '../status.js'

export enum DiffType {
  Text,
  Image,
  Binary,
  Submodule,
  LargeText,
  Unrenderable,
}

type LineEnding = 'CR' | 'LF' | 'CRLF'

export type LineEndingsChange = {
  from: LineEnding
  to: LineEnding
}

export function parseLineEndingText(text: string): LineEnding | null {
  const input = text.trim()
  switch (input) {
    case 'CR': return 'CR'
    case 'LF': return 'LF'
    case 'CRLF': return 'CRLF'
    default: return null
  }
}

interface ITextDiffData {
  readonly text: string
  readonly hunks: ReadonlyArray<DiffHunk>
  readonly lineEndingsChange?: LineEndingsChange
  readonly maxLineNumber: number
  readonly hasHiddenBidiChars: boolean
}

export interface ITextDiff extends ITextDiffData {
  readonly kind: DiffType.Text
}

export interface IImageDiff {
  readonly kind: DiffType.Image
  readonly previous?: Image
  readonly current?: Image
  readonly textDiff?: ITextDiffData
}

export interface IBinaryDiff {
  readonly kind: DiffType.Binary
}

export interface ISubmoduleDiff {
  readonly kind: DiffType.Submodule
  readonly fullPath: string
  readonly path: string
  readonly url: string | null
  readonly status: SubmoduleStatus
  readonly oldSHA: string | null
  readonly newSHA: string | null
}

export interface ILargeTextDiff extends ITextDiffData {
  readonly kind: DiffType.LargeText
}

export interface IUnrenderableDiff {
  readonly kind: DiffType.Unrenderable
}

export type IDiff =
  | ITextDiff
  | IImageDiff
  | IBinaryDiff
  | ISubmoduleDiff
  | ILargeTextDiff
  | IUnrenderableDiff
