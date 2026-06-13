import * as Path from 'path'

export class Repository {
  public readonly name: string

  public constructor(
    public readonly path: string,
    public readonly id: number = 0
  ) {
    this.name = Path.basename(path)
  }

  public get resolvedGitDir(): string {
    return Path.join(this.path, '.git')
  }
}
