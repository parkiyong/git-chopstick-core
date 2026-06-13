// ── All git operations ──
export * from './git/index.js'

// ── Git error codes enum (renamed to avoid conflict with GitError class from core.js) ──
export { GitError as GitErrorCodes, type IGitSpawnOptions } from './git/exec.js'

// ── All domain models ──
export * from './models/index.js'

// ── Explicit re-exports to resolve ambiguities between git and models ──
export type { ITrailer } from './models/commit.js'
