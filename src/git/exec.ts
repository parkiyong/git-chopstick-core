import { spawn, SpawnOptions } from 'child_process'

/**
 * Git error types parsed from stderr output.
 * This is a simplified version of dugite's GitError enum.
 */
export enum GitError {
  // Authentication
  SSHAuthenticationFailed = 'SSHAuthenticationFailed',
  SSHPermissionDenied = 'SSHPermissionDenied',
  HTTPSAuthenticationFailed = 'HTTPSAuthenticationFailed',
  SSHKeyAuditUnverified = 'SSHKeyAuditUnverified',

  // Remote
  RemoteDisconnection = 'RemoteDisconnection',
  HostDown = 'HostDown',
  HTTPSRepositoryNotFound = 'HTTPSRepositoryNotFound',
  SSHRepositoryNotFound = 'SSHRepositoryNotFound',

  // Push / Pull
  PushNotFastForward = 'PushNotFastForward',
  PushWithFileSizeExceedingLimit = 'PushWithFileSizeExceedingLimit',
  PushWithPrivateEmail = 'PushWithPrivateEmail',
  PushWithSecretDetected = 'PushWithSecretDetected',
  ForcePushRejected = 'ForcePushRejected',
  ProtectedBranchForcePush = 'ProtectedBranchForcePush',
  ProtectedBranchRequiresReview = 'ProtectedBranchRequiresReview',
  ProtectedBranchDeleteRejected = 'ProtectedBranchDeleteRejected',
  ProtectedBranchRequiredStatus = 'ProtectedBranchRequiredStatus',

  // Branch
  BranchDeletionFailed = 'BranchDeletionFailed',
  DefaultBranchDeletionFailed = 'DefaultBranchDeletionFailed',
  BranchAlreadyExists = 'BranchAlreadyExists',
  BranchRenameFailed = 'BranchRenameFailed',
  HexBranchNameRejected = 'HexBranchNameRejected',
  InvalidRefLength = 'InvalidRefLength',

  // Merge / Rebase
  MergeConflicts = 'MergeConflicts',
  RebaseConflicts = 'RebaseConflicts',
  MergeWithLocalChanges = 'MergeWithLocalChanges',
  RebaseWithLocalChanges = 'RebaseWithLocalChanges',
  InvalidMerge = 'InvalidMerge',
  InvalidRebase = 'InvalidRebase',
  NonFastForwardMergeIntoEmptyHead = 'NonFastForwardMergeIntoEmptyHead',
  CannotMergeUnrelatedHistories = 'CannotMergeUnrelatedHistories',
  NoMergeToAbort = 'NoMergeToAbort',
  RevertConflicts = 'RevertConflicts',

  // Rebase
  EmptyRebasePatch = 'EmptyRebasePatch',

  // Commit
  NothingToCommit = 'NothingToCommit',
  GPGFailedToSignData = 'GPGFailedToSignData',

  // Bad config
  BadConfigValue = 'BadConfigValue',
  ConfigLockFileAlreadyExists = 'ConfigLockFileAlreadyExists',

  // Misc
  NotAGitRepository = 'NotAGitRepository',
  BadRevision = 'BadRevision',
  LocalPermissionDenied = 'LocalPermissionDenied',
  NoMatchingRemoteBranch = 'NoMatchingRemoteBranch',
  NoExistingRemoteBranch = 'NoExistingRemoteBranch',
  PatchDoesNotApply = 'PatchDoesNotApply',
  NoSubmoduleMapping = 'NoSubmoduleMapping',
  SubmoduleRepositoryDoesNotExist = 'SubmoduleRepositoryDoesNotExist',
  InvalidSubmoduleSHA = 'InvalidSubmoduleSHA',
  LockFileAlreadyExists = 'LockFileAlreadyExists',
  UnresolvedConflicts = 'UnresolvedConflicts',
  LocalChangesOverwritten = 'LocalChangesOverwritten',
  RemoteAlreadyExists = 'RemoteAlreadyExists',
  TagAlreadyExists = 'TagAlreadyExists',
  PathDoesNotExist = 'PathDoesNotExist',
  InvalidObjectName = 'InvalidObjectName',
  OutsideRepository = 'OutsideRepository',
  ConflictModifyDeletedInBranch = 'ConflictModifyDeletedInBranch',
  MergeCommitNoMainlineOption = 'MergeCommitNoMainlineOption',
  UnsafeDirectory = 'UnsafeDirectory',
  PathExistsButNotInRef = 'PathExistsButNotInRef',
  LFSAttributeDoesNotMatch = 'LFSAttributeDoesNotMatch',
}

export class ExecError extends Error {
  public readonly code: string
  public readonly stdout: string | Buffer
  public readonly stderr: string | Buffer
  public readonly cause?: Error

  constructor(
    message: string,
    stdout: string | Buffer,
    stderr: string | Buffer,
    cause?: Error
  ) {
    super(message)
    this.name = 'ExecError'
    this.code = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
    this.stdout = stdout
    this.stderr = stderr
    this.cause = cause
  }
}

export interface IGitResult {
  readonly stdout: string | Buffer
  readonly stderr: string | Buffer
  readonly exitCode: number
}

export interface IGitExecutionOptions {
  readonly env?: Record<string, string | undefined>
  readonly cwd?: string
  readonly stdin?: string
  readonly maxBuffer?: number
  readonly processCallback?: (process: any) => void
  readonly encoding?: BufferEncoding
}

export interface IGitSpawnOptions extends SpawnOptions {
  readonly stdin?: string
}

/**
 * Execute a git command and return the result.
 */
export async function exec(
  args: string[],
  path: string,
  options?: IGitExecutionOptions
): Promise<IGitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: path,
      env: {
        ...process.env,
        TERM: 'dumb',
        ...options?.env,
      } as Record<string, string>,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

    if (options?.processCallback) {
      options.processCallback(child)
    }

    if (options?.stdin) {
      child.stdin?.write(options.stdin)
      child.stdin?.end()
    }

    child.on('close', (exitCode) => {
      const stdoutBuf = Buffer.concat(stdoutChunks as readonly Uint8Array[])
      const stderrBuf = Buffer.concat(stderrChunks as readonly Uint8Array[])

      const enc = (options as any)?.encoding
      const isBuffer = enc === 'buffer'

      resolve({
        stdout: isBuffer ? stdoutBuf : stdoutBuf.toString(options?.encoding || 'utf-8'),
        stderr: isBuffer ? stderrBuf : stderrBuf.toString(options?.encoding || 'utf-8'),
        exitCode: exitCode ?? -1,
      })
    })

    child.on('error', (err: Error) => {
      reject(err)
    })
  })
}

/**
 * Spawn a git process, returning the ChildProcess for streaming access.
 */
export function spawnGit(
  args: string[],
  path: string,
  options?: IGitSpawnOptions
) {
  return spawn('git', args, {
    ...options,
    cwd: path,
    env: {
      ...process.env,
      TERM: 'dumb',
      ...options?.env,
    } as Record<string, string>,
  })
}

/**
 * Parse git stderr output into a GitError enum value.
 */
export function parseError(stderr: string): GitError | null {
  if (!stderr) return null

  // Authentication errors
  if (stderr.includes('Permission denied (publickey)'))
    return GitError.SSHPermissionDenied
  if (stderr.includes('fatal: Could not read from remote repository'))
    return GitError.SSHAuthenticationFailed
  if (stderr.includes('Authentication failed'))
    return GitError.HTTPSAuthenticationFailed

  // Merge conflicts
  if (stderr.includes('Automatic merge failed'))
    return GitError.MergeConflicts
  if (stderr.includes('merge failed')) return GitError.MergeConflicts
  if (stderr.includes('conflict')) return GitError.MergeConflicts

  // Rebase
  if (stderr.includes('could not apply'))
    return GitError.RebaseConflicts
  if (stderr.includes('interactive rebase already started'))
    return GitError.RebaseConflicts

  // Push
  if (stderr.includes('push is not fast forward') || stderr.includes('[rejected]'))
    return GitError.PushNotFastForward
  if (stderr.includes('failed to push'))
    return GitError.PushNotFastForward

  // Remote
  if (stderr.includes('Could not resolve host'))
    return GitError.RemoteDisconnection
  if (stderr.includes('host down')) return GitError.HostDown
  if (stderr.includes('Repository not found'))
    return GitError.HTTPSRepositoryNotFound
  if (stderr.includes('not found')) return GitError.HTTPSRepositoryNotFound

  // Branch
  if (stderr.includes('branch .* already exists'))
    return GitError.BranchAlreadyExists
  if (stderr.includes('not a valid branch'))
    return GitError.BranchDeletionFailed
  if (stderr.includes('could not delete'))
    return GitError.BranchDeletionFailed

  // Config
  if (stderr.includes('bad config value'))
    return GitError.BadConfigValue
  if (stderr.includes('bad numeric config value'))
    return GitError.BadConfigValue
  if (stderr.includes('config file lock'))
    return GitError.ConfigLockFileAlreadyExists

  // Misc
  if (stderr.includes('fatal: not a git repository'))
    return GitError.NotAGitRepository
  if (stderr.includes('bad revision'))
    return GitError.BadRevision
  if (stderr.includes('nothing to commit'))
    return GitError.NothingToCommit
  if (stderr.includes('Permission denied'))
    return GitError.LocalPermissionDenied
  if (stderr.includes('pathspec .* did not match'))
    return GitError.PathDoesNotExist
  if (stderr.includes('did not match any files'))
    return GitError.PathDoesNotExist

  return null
}

/**
 * Parse information about a bad config value error.
 */
export function parseBadConfigValueErrorInfo(
  stderr: string
): { key: string; value: string } | null {
  const match = stderr.match(
    /bad config value for '([^']+)' in ([^:]+):?\s*(.*)/
  )
  if (!match) return null

  return { key: match[1], value: match[3]?.trim() || '' }
}
