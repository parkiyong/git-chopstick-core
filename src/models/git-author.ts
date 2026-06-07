export class GitAuthor {
  public static parse(value: string): GitAuthor | null {
    const m = value.match(/^(.*?)\s*<(.+?)>\s*$/)
    if (!m) return null
    return new GitAuthor(m[1], m[2])
  }

  public constructor(
    public readonly name: string,
    public readonly email: string
  ) {}

  public toString(): string {
    return `${this.name} <${this.email}>`
  }
}
