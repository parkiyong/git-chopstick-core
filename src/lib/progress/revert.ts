import { IGitOutput } from './index.js'

/**
 * Git revert does not produce progress output on stderr,
 * so this parser remains effectively a stub for the interface.
 */
export class RevertProgressParser {
  public parse(_line: string): IGitOutput | null {
    return null
  }

  public get percent(): number {
    return 0
  }

  public get details(): { text: string } {
    return { text: '' }
  }

  public get kind(): string {
    return 'progress'
  }
}
