export enum BranchType {
  Local = 0,
  Remote = 1,
}

export interface IAheadBehind {
  readonly ahead: number
  readonly behind: number
}

export interface ICompareResult extends IAheadBehind {
  readonly commits: ReadonlyArray<Commit>
}

export interface ITrackingBranch {
  readonly ref: string
  readonly sha: string
  readonly upstreamRef: string
  readonly upstreamSha: string
}

export interface IAuthor {
  readonly date: Date
}

export interface IBranchTip {
  readonly sha: string
  readonly author: IAuthor
}

export enum StartPoint {
  CurrentBranch = 'CurrentBranch',
  DefaultBranch = 'DefaultBranch',
  Head = 'Head',
  UpstreamDefaultBranch = 'UpstreamDefaultBranch',
}

export class Branch {
  public constructor(
    public readonly name: string,
    public readonly upstream: string | null,
    public readonly tip: IBranchTip,
    public readonly type: BranchType,
    public readonly ref: string,
    public readonly isGone: boolean
  ) {}

  public get upstreamRemoteName(): string | null {
    const upstream = this.upstream
    if (!upstream) return null
    const pieces = upstream.match(/(.*?)\/.*/)
    if (!pieces || pieces.length < 2) return null
    return pieces[1]
  }

  public get remoteName(): string | null {
    if (this.type === BranchType.Local) return null
    const pieces = this.ref.match(/^refs\/remotes\/(.*?)\/.*/)
    if (!pieces || pieces.length !== 2) {
      throw new Error(`Remote branch ref has unexpected format: ${this.ref}`)
    }
    return pieces[1]
  }

  public get upstreamWithoutRemote(): string | null {
    if (!this.upstream) return null
    const pieces = this.upstream.match(/^[^/]+\/(.*)/)
    return pieces ? pieces[1] : null
  }

  public get nameWithoutRemote(): string {
    if (this.type === BranchType.Local) return this.name
    const pieces = this.name.match(/^[^/]+\/(.*)/)
    return pieces ? pieces[1] : this.name
  }
}

import { Commit } from './commit'
