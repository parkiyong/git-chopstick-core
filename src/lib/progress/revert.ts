export class RevertProgressParser {
  public parse(_line: string): any {
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
