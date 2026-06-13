import { DiffLine } from './diff-line.js'

export enum DiffHunkExpansionType {
  None = 'None',
  Up = 'Up',
  Down = 'Down',
  Both = 'Both',
  Short = 'Short',
}

export class DiffHunk {
  public constructor(
    public readonly header: DiffHunkHeader,
    public readonly lines: ReadonlyArray<DiffLine>,
    public readonly unifiedDiffStart: number,
    public readonly unifiedDiffEnd: number,
    public readonly expansionType: DiffHunkExpansionType
  ) {}
}

export class DiffHunkHeader {
  public constructor(
    public readonly oldStartLine: number,
    public readonly oldLineCount: number,
    public readonly newStartLine: number,
    public readonly newLineCount: number
  ) {}

  public toDiffLineRepresentation() {
    return `@@ -${this.oldStartLine},${this.oldLineCount} +${this.newStartLine},${this.newLineCount} @@`
  }
}

export interface IRawDiff {
  readonly header: string
  readonly contents: string
  readonly hunks: ReadonlyArray<DiffHunk>
  readonly isBinary: boolean
  readonly maxLineNumber: number
  readonly hasHiddenBidiChars: boolean
}
