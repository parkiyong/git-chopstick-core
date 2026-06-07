export class CommitIdentity {
  public static parseIdentity(identity: string): CommitIdentity {
    const m = identity.match(/^(.*?) <(.*?)> (\d+) (\+|-)?(\d{2})(\d{2})/)
    if (!m) {
      throw new Error(`Couldn't parse identity ${identity}`)
    }

    const name = m[1]
    const email = m[2]
    const date = new Date(parseInt(m[3], 10) * 1000)

    if (isNaN(date.valueOf())) {
      throw new Error(`Couldn't parse identity ${identity}, invalid date`)
    }

    const tzSign = m[4] === '-' ? '-' : '+'
    const tzHH = m[5]
    const tzmm = m[6]
    const tzMinutes = parseInt(tzHH, 10) * 60 + parseInt(tzmm, 10)
    const tzOffset = tzMinutes * (tzSign === '-' ? -1 : 1)

    return new CommitIdentity(name, email, date, tzOffset)
  }

  public constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly date: Date,
    public readonly tzOffset: number = new Date().getTimezoneOffset()
  ) {}

  public toString() {
    return `${this.name} <${this.email}>`
  }
}
