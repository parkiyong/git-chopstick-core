export enum DiffLineType {
  Context,
  Add,
  Delete,
  Hunk,
}

export class DiffLine {
  public constructor(
    public readonly text: string,
    public readonly type: DiffLineType,
    public readonly originalLineNumber: number | null,
    public readonly oldLineNumber: number | null,
    public readonly newLineNumber: number | null,
    public readonly noTrailingNewLine: boolean = false
  ) {}

  public withNoTrailingNewLine(noTrailingNewLine: boolean): DiffLine {
    return new DiffLine(
      this.text,
      this.type,
      this.originalLineNumber,
      this.oldLineNumber,
      this.newLineNumber,
      noTrailingNewLine
    )
  }

  public isIncludeableLine() {
    return this.type === DiffLineType.Add || this.type === DiffLineType.Delete
  }

  public get content(): string {
    return this.text.substring(1)
  }
}
