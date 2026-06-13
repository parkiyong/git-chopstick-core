import {
  IRawDiff,
  DiffHunk,
  DiffHunkHeader,
  DiffLine,
  DiffLineType,
  DiffHunkExpansionType,
} from '../models/diff/index.js'
import { assertNever } from './fatal-error.js'

const diffHeaderRe = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

export const HiddenBidiCharsRegex = /[\u202A-\u202E]|[\u2066-\u2069]/

const DiffPrefixAdd = '+' as const
const DiffPrefixDelete = '-' as const
const DiffPrefixContext = ' ' as const
const DiffPrefixNoNewline = '\\' as const

type DiffLinePrefix =
  | typeof DiffPrefixAdd
  | typeof DiffPrefixDelete
  | typeof DiffPrefixContext
  | typeof DiffPrefixNoNewline

const DiffLinePrefixChars: Set<DiffLinePrefix> = new Set([
  DiffPrefixAdd,
  DiffPrefixDelete,
  DiffPrefixContext,
  DiffPrefixNoNewline,
])

interface IDiffHeaderInfo {
  readonly isBinary: boolean
}

function getLargestLineNumber(hunks: ReadonlyArray<DiffHunk>): number {
  let largest = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.originalLineNumber !== null && line.originalLineNumber > largest) {
        largest = line.originalLineNumber
      }
    }
  }
  return largest
}

function getHunkHeaderExpansionType(
  _hunkIndex: number,
  _header: DiffHunkHeader,
  _previousHunk: DiffHunk | null
): DiffHunkExpansionType {
  return DiffHunkExpansionType.None
}

export class DiffParser {
  private ls!: number
  private le!: number
  private text!: string

  public constructor() {
    this.reset()
  }

  private reset() {
    this.ls = 0
    this.le = -1
    this.text = ''
  }

  private nextLine(): boolean {
    this.ls = this.le + 1
    if (this.ls >= this.text.length) return false
    this.le = this.text.indexOf('\n', this.ls)
    if (this.le === -1) this.le = this.text.length
    return this.ls !== this.le
  }

  private readLine(): string | null {
    return this.nextLine() ? this.text.substring(this.ls, this.le) : null
  }

  private lineStartsWith(searchString: string): boolean {
    return this.text.startsWith(searchString, this.ls)
  }

  private lineEndsWith(searchString: string): boolean {
    return this.text.endsWith(searchString, this.le)
  }

  private peek(): string | null {
    const p = this.le + 1
    return p < this.text.length ? this.text[p] : null
  }

  private parseDiffHeader(): IDiffHeaderInfo | null {
    while (this.nextLine()) {
      if (this.lineStartsWith('Binary files ') && this.lineEndsWith('differ')) {
        return { isBinary: true }
      }
      if (this.lineStartsWith('+++')) {
        return { isBinary: false }
      }
    }
    return null
  }

  private numberFromGroup(
    m: RegExpMatchArray,
    group: number,
    defaultValue: number | null = null
  ): number {
    const str = m[group]
    if (!str) {
      if (defaultValue === null) {
        throw new Error(
          `Group ${group} missing from regexp match and no defaultValue was provided`
        )
      }
      return defaultValue
    }
    const num = parseInt(str, 10)
    if (isNaN(num)) {
      throw new Error(`Could not parse capture group ${group} into number: ${str}`)
    }
    return num
  }

  private parseHunkHeader(line: string): DiffHunkHeader {
    const m = diffHeaderRe.exec(line)
    if (!m) throw new Error('Invalid hunk header format')

    const oldStartLine = this.numberFromGroup(m, 1)
    const oldLineCount = this.numberFromGroup(m, 2, 1)
    const newStartLine = this.numberFromGroup(m, 3)
    const newLineCount = this.numberFromGroup(m, 4, 1)

    return new DiffHunkHeader(oldStartLine, oldLineCount, newStartLine, newLineCount)
  }

  private parseLinePrefix(c: string | null): DiffLinePrefix | null {
    if (c && c.length && (DiffLinePrefixChars as Set<string>).has(c[0])) {
      return c[0] as DiffLinePrefix
    }
    return null
  }

  private parseHunk(
    linesConsumed: number,
    _hunkIndex: number,
    _previousHunk: DiffHunk | null
  ): DiffHunk {
    const headerLine = this.readLine()
    if (!headerLine) throw new Error('Expected hunk header but reached end of diff')

    const header = this.parseHunkHeader(headerLine)
    const lines = new Array<DiffLine>()
    lines.push(new DiffLine(headerLine, DiffLineType.Hunk, 1, null, null))

    let rollingDiffBeforeCounter = header.oldStartLine
    let rollingDiffAfterCounter = header.newStartLine
    let diffLineNumber = linesConsumed

    let c: DiffLinePrefix | null
    while ((c = this.parseLinePrefix(this.peek()))) {
      const line = this.readLine()
      if (!line) throw new Error('Expected unified diff line but reached end of diff')

      if (c === DiffPrefixNoNewline) {
        if (line.length < 12) {
          throw new Error(
            `Expected "no newline at end of file" marker to be at least 12 bytes long`
          )
        }
        const previousLineIndex = lines.length - 1
        lines[previousLineIndex] = lines[previousLineIndex].withNoTrailingNewLine(true)
        continue
      }

      diffLineNumber++

      let diffLine: DiffLine
      if (c === DiffPrefixAdd) {
        diffLine = new DiffLine(line, DiffLineType.Add, diffLineNumber, null, rollingDiffAfterCounter++)
      } else if (c === DiffPrefixDelete) {
        diffLine = new DiffLine(line, DiffLineType.Delete, diffLineNumber, rollingDiffBeforeCounter++, null)
      } else if (c === DiffPrefixContext) {
        diffLine = new DiffLine(line, DiffLineType.Context, diffLineNumber, rollingDiffBeforeCounter++, rollingDiffAfterCounter++)
      } else {
        return assertNever(c, `Unknown DiffLinePrefix: ${c}`)
      }
      lines.push(diffLine)
    }

    if (lines.length === 1) {
      throw new Error('Malformed diff, empty hunk')
    }

    return new DiffHunk(
      header,
      lines,
      linesConsumed,
      linesConsumed + lines.length - 1,
      getHunkHeaderExpansionType(_hunkIndex, header, _previousHunk)
    )
  }

  public parse(text: string): IRawDiff {
    this.text = text
    try {
      const headerInfo = this.parseDiffHeader()
      const headerEnd = this.le
      const header = this.text.substring(0, headerEnd)

      if (!headerInfo) {
        return { header, contents: '', hunks: [], isBinary: false, maxLineNumber: 0, hasHiddenBidiChars: false }
      }

      if (headerInfo.isBinary) {
        return { header, contents: '', hunks: [], isBinary: true, maxLineNumber: 0, hasHiddenBidiChars: false }
      }

      const hunks = new Array<DiffHunk>()
      let linesConsumed = 0

      do {
        const hunk = this.parseHunk(linesConsumed, hunks.length, null)
        hunks.push(hunk)
        linesConsumed += hunk.lines.length
      } while (this.peek())

      const contents = this.text
        .substring(headerEnd + 1, this.le)
        .replace(/\n\\ No newline at end of file/g, '')

      return {
        header,
        contents,
        hunks,
        isBinary: headerInfo.isBinary,
        maxLineNumber: getLargestLineNumber(hunks),
        hasHiddenBidiChars: HiddenBidiCharsRegex.test(text),
      }
    } finally {
      this.reset()
    }
  }
}
