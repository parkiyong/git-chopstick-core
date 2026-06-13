export function shortenSHA(sha: string) {
  return sha.slice(0, 7)
}

export interface ICommitContext {
  readonly summary: string
  readonly description: string | null
  readonly amend?: boolean
  readonly trailers?: ReadonlyArray<ITrailer>
}

export type CommitOneLine = {
  readonly sha: string
  readonly summary: string
}

export interface ITrailer {
  readonly token: string
  readonly value: string
}

export class Commit {
  public readonly authoredByCommitter: boolean
  public readonly isMergeCommit: boolean

  public constructor(
    public readonly sha: string,
    public readonly shortSha: string,
    public readonly summary: string,
    public readonly body: string,
    public readonly author: CommitIdentity,
    public readonly committer: CommitIdentity,
    public readonly parentSHAs: ReadonlyArray<string>,
    public readonly trailers: ReadonlyArray<ITrailer>,
    public readonly tags: ReadonlyArray<string>
  ) {
    this.authoredByCommitter =
      this.author.name === this.committer.name &&
      this.author.email === this.committer.email
    this.isMergeCommit = parentSHAs.length > 1
  }
}

import { CommitIdentity } from './commit-identity.js'
