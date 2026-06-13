export { executionOptionsWithProgress } from './from-process.js'

export interface IGitOutput {
  kind: string
  text?: string
  percent: number
  details?: { text: string }
}

export class CheckoutProgressParser {
  public parse(line: string): any { return null }
  get percent(): number { return 0 }
  get details(): { text: string } { return { text: '' } }
  get kind(): string { return 'progress' }
}

export class FetchProgressParser {
  public parse(line: string): any { return null }
  get percent(): number { return 0 }
  get details(): { text: string } { return { text: '' } }
  get kind(): string { return 'progress' }
}

export class PullProgressParser {
  public parse(line: string): any { return null }
  get percent(): number { return 0 }
  get details(): { text: string } { return { text: '' } }
  get kind(): string { return 'progress' }
}

export class PushProgressParser {
  public parse(line: string): any { return null }
  get percent(): number { return 0 }
  get details(): { text: string } { return { text: '' } }
  get kind(): string { return 'progress' }
}

export class CloneProgressParser {
  public parse(line: string): any { return null }
  get percent(): number { return 0 }
  get details(): { text: string } { return { text: '' } }
  get kind(): string { return 'progress' }
}
