/**
 * Example: Create a commit — stage files and commit them.
 *
 * Usage:
 *   npx tsx examples/create-commit.ts /path/to/repo "commit message"
 *   bun examples/create-commit.ts /path/to/repo "commit message"
 */

import {
  Repository,
  getStatus,
  createCommit,
  GitError,
  GitErrorCodes,
} from '../src/index.js'

async function main() {
  const repoPath = process.argv[2]
  const commitMessage = process.argv[3] ?? 'feat: example commit from git-chopstick-core'

  if (!repoPath) {
    console.error('Usage: npx tsx examples/create-commit.ts <path-to-repo> [commit-message]')
    process.exit(1)
  }

  const repo = new Repository(repoPath, 1)
  console.log(`\n📂 Repository: ${repo.name}`)
  console.log(`   Path: ${repo.path}\n`)

  // ── Get current status ──
  const status = await getStatus(repo)

  if (!status) {
    console.log('❌ Not a git repository')
    process.exit(1)
  }

  const files = status.workingDirectory.files
  console.log(`🌿 Branch: ${status.currentBranch ?? '(detached)'}`)
  console.log(`📝 Changed files: ${files.length}`)

  if (files.length === 0) {
    console.log('\n⚠️  No changes to commit. Make some edits first.')
    process.exit(0)
  }

  // ── Show files that will be committed ──
  console.log('\n── Files to commit ──')
  for (const file of files) {
    const icon =
      file.status.kind === 'New' ? '🆕' :
      file.status.kind === 'Modified' ? '📝' :
      file.status.kind === 'Deleted' ? '🗑️' :
      file.status.kind === 'Renamed' ? '📎' :
      file.status.kind === 'Copied' ? '📋' :
      file.status.kind === 'Conflicted' ? '⚠️' : '❓'
    const submoduleInfo = file.status.submoduleStatus
      ? ` [submodule: commitChanged=${submoduleInfo.commitChanged}]`
      : ''
    console.log(`  ${icon} ${file.path}${submoduleInfo}`)
  }

  // ── Create the commit ──
  console.log(`\n── Creating commit ──`)
  console.log(`   Message: ${commitMessage}`)

  const sha = await createCommit(repo, commitMessage, files, {
    // Prevent hooks from blocking the commit in this demo
    noVerify: true,
  })

  console.log(`\n✅ Committed: ${sha}`)
  console.log(`   Short SHA: ${sha.slice(0, 7)}`)
}

main().catch(err => {
  if (err instanceof GitError) {
    console.error(`\n❌ Git error [${err.result.gitError ?? 'UNKNOWN'}]: ${err.message}`)
    switch (err.result.gitError) {
      case GitErrorCodes.NothingToCommit:
        console.error('   No changes to commit.')
        break
      case GitErrorCodes.UnresolvedConflicts:
        console.error('   There are unresolved conflicts. Resolve them first.')
        break
      case GitErrorCodes.NotAGitRepository:
        console.error('   The path is not a git repository.')
        break
    }
  } else {
    console.error('Error:', err)
  }
  process.exit(1)
})
