export { executionOptionsWithProgress } from './from-process.js'

export interface IGitOutput {
  kind: string
  text?: string
  percent: number
  details?: { text: string; title?: string }
}

/**
 * Extract progress percentage from common git progress lines.
 * Matches patterns like:
 *   Receiving objects:  15% (150/1000)
 *   Resolving deltas:   0% (0/2145)
 *   Checking out files: 45% (230/512)
 *   Writing objects:   10% (5/50)
 *   remote: Counting objects: 100% (15/15)
 */
function parseProgressLine(line: string): { percent: number; text: string } | null {
  const match = line.match(/(\d+)%\s*\([\d/]+\)/)
  if (match) {
    return { percent: parseInt(match[1], 10), text: line }
  }
  return null
}

export class CheckoutProgressParser {
  private _percent = 0
  private _details = { text: '' }

  public parse(line: string): IGitOutput | null {
    // Checking out files: 45% (230/512)
    const progress = parseProgressLine(line)
    if (progress && line.includes('Checking out files')) {
      this._percent = progress.percent
      this._details = { text: line }
      return { kind: 'progress', percent: this._percent, details: this._details }
    }
    return null
  }

  get percent(): number { return this._percent }
  get details(): { text: string } { return this._details }
  get kind(): string { return 'progress' }
}

export class FetchProgressParser {
  private _percent = 0
  private _details = { text: '' }

  public parse(line: string): IGitOutput | null {
    // Receiving objects: 15% (150/1000)
    // Resolving deltas:  0% (0/2145)
    const progress = parseProgressLine(line)
    if (progress && (line.includes('Receiving objects') || line.includes('Resolving deltas'))) {
      this._percent = progress.percent
      this._details = { text: line }
      return { kind: 'progress', percent: this._percent, details: this._details }
    }

    // remote: Counting objects, remote: Compressing objects, etc.
    if (line.startsWith('remote:')) {
      return { kind: 'context', text: line, percent: this._percent }
    }

    return null
  }

  get percent(): number { return this._percent }
  get details(): { text: string } { return this._details }
  get kind(): string { return 'progress' }
}

export class PullProgressParser {
  private _percent = 0
  private _details = { text: '' }

  public parse(line: string): IGitOutput | null {
    // Pull combines fetch + merge, so it can have receiving/resolving deltas
    const progress = parseProgressLine(line)
    if (progress && (line.includes('Receiving objects') || line.includes('Resolving deltas'))) {
      this._percent = progress.percent
      this._details = { text: line }
      return { kind: 'progress', percent: this._percent, details: this._details }
    }

    // remote: Counting objects, etc.
    if (line.startsWith('remote:')) {
      return { kind: 'context', text: line, percent: this._percent }
    }

    return null
  }

  get percent(): number { return this._percent }
  get details(): { text: string } { return this._details }
  get kind(): string { return 'progress' }
}

export class PushProgressParser {
  private _percent = 0
  private _details = { text: '' }

  public parse(line: string): IGitOutput | null {
    // Writing objects: 10% (5/50)
    const progress = parseProgressLine(line)
    if (progress && line.includes('Writing objects')) {
      this._percent = progress.percent
      this._details = { text: line }
      return { kind: 'progress', percent: this._percent, details: this._details }
    }

    // remote: Resolving deltas: 100%, remote: Processing references, etc.
    if (line.startsWith('remote:')) {
      const remoteProgress = parseProgressLine(line)
      if (remoteProgress) {
        // remote lines that contain progress (e.g. remote: Resolving deltas: 100% (12/12))
        this._percent = remoteProgress.percent
        this._details = { text: line }
        return { kind: 'progress', percent: this._percent, details: this._details }
      }
      return { kind: 'context', text: line, percent: this._percent }
    }

    return null
  }

  get percent(): number { return this._percent }
  get details(): { text: string } { return this._details }
  get kind(): string { return 'progress' }
}

export class CloneProgressParser {
  private _percent = 0
  private _details = { text: '' }

  public parse(line: string): IGitOutput | null {
    // Cloning into 'repo-name'...
    if (line.startsWith('Cloning into')) {
      return { kind: 'context', text: line, percent: 0 }
    }

    // Receiving objects: 15% (150/1000) — clone downloads objects
    // Resolving deltas:  0% (0/2145)  — clone resolves deltas
    // Checking out files: 45% (230/512) — clone checks out working tree
    const progress = parseProgressLine(line)
    if (progress && (line.includes('Receiving objects') || line.includes('Resolving deltas') || line.includes('Checking out files'))) {
      this._percent = progress.percent
      this._details = { text: line }
      return { kind: 'progress', percent: this._percent, details: this._details }
    }

    // remote: Enumerating objects, remote: Counting objects, etc.
    if (line.startsWith('remote:')) {
      return { kind: 'context', text: line, percent: this._percent }
    }

    return null
  }

  get percent(): number { return this._percent }
  get details(): { text: string } { return this._details }
  get kind(): string { return 'progress' }
}
