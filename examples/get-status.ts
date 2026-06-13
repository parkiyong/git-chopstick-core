/**
 * Example: Open a repo and show its current status.
 *
 * Usage:
 *   bun examples/get-status.ts /path/to/some/repo
 *   npx tsx examples/get-status.ts /path/to/some/repo
 */

import { Repository, getStatus, GitError, GitErrorCodes } from '../src/index.js'

async function main() {
  const repoPath = process.argv[2]
  if (!repoPath) {
    console.error('Usage: bun examples/get-status.ts <path-to-repo>')
    process.exit(1)
  }

  const repo = new Repository(repoPath, 1)

  console.log(`\n📂 Repository: ${repo.name}`)
  console.log(`   Path: ${repo.path}\n`)

  const status = await getStatus(repo)

  if (!status) {
    console.log('❌ Could not read repository status (not a git repo?)')
    process.exit(1)
  }

  // Branch info
  console.log(`🌿 Branch: ${status.currentBranch ?? '(detached HEAD)'}`)
  if (status.currentUpstreamBranch) {
    console.log(`   Upstream: ${status.currentUpstreamBranch}`)
  }
  if (status.branchAheadBehind) {
    const { ahead, behind } = status.branchAheadBehind
    console.log(`   Ahead: ${ahead}  |  Behind: ${behind}`)
  }
  console.log(`   Tip: ${status.currentTip?.slice(0, 7) ?? 'N/A'}`)

  // Conflicted files
  if (status.doConflictedFilesExist) {
    console.log(`\n⚠️  Conflicts detected!`)
  }

  // Working directory changes
  const files = status.workingDirectory.files
  console.log(`\n📝 Changed files: ${files.length}`)

  // Group by status kind
  const byKind = new Map<string, string[]>()
  for (const file of files) {
    const kind = file.status.kind
    const list = byKind.get(kind) ?? []
    list.push(
      kind === 'Renamed' || kind === 'Copied'
        ? `${file.path} (was: ${file.status.oldPath})`
        : file.path
    )
    byKind.set(kind, list)
  }

  for (const [kind, paths] of byKind) {
    console.log(`   ${kind}:`)
    for (const p of paths) {
      console.log(`     - ${p}`)
    }
  }

  // Merge/rebase state
  if (status.mergeHeadFound) {
    console.log(`\n🔀 Merge in progress`)
  }
  if (status.rebaseInternalState) {
    console.log(`\n🔄 Rebase in progress`)
    console.log(`   Target: ${status.rebaseInternalState.targetBranch}`)
  }
  if (status.isCherryPickingHeadFound) {
    console.log(`\n🍒 Cherry-pick in progress`)
  }
}

main().catch(err => {
  if (err instanceof GitError) {
    console.error(`\n❌ Git error [${err.result.gitError ?? 'UNKNOWN'}]: ${err.message}`)
    if (err.result.gitError === GitErrorCodes.NotAGitRepository) {
      console.error('   The path is not a valid git repository.')
    }
  } else {
    console.error('Error:', err)
  }
  process.exit(1)
})
