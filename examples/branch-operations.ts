/**
 * Example: Branch operations — list, create, rename, and delete branches.
 *
 * Usage:
 *   npx tsx examples/branch-operations.ts /path/to/repo
 *   bun examples/branch-operations.ts /path/to/repo
 */

import {
  Repository,
  getBranches,
  createBranch,
  renameBranch,
  deleteLocalBranch,
  BranchType,
  GitError,
  GitErrorCodes,
} from '../src/index.js'

async function main() {
  const repoPath = process.argv[2]
  if (!repoPath) {
    console.error('Usage: npx tsx examples/branch-operations.ts <path-to-repo>')
    process.exit(1)
  }

  const repo = new Repository(repoPath, 1)
  console.log(`\n📂 Repository: ${repo.name}\n`)

  // ── List all branches ──
  console.log('── Listing branches ──')
  const branches = await getBranches(repo)
  for (const branch of branches) {
    const icon = branch.type === BranchType.Local ? '🌿' : '🌐'
    const upstream = branch.upstream ? ` → ${branch.upstream}` : ''
    const gone = branch.isGone ? ' [upstream gone]' : ''
    console.log(`  ${icon} ${branch.name}${upstream}${gone}`)
  }

  // ── Create a new branch ──
  const testBranchName = 'chopstick-demo-branch'
  console.log(`\n── Creating branch: ${testBranchName} ──`)

  // Check if it already exists
  const exists = branches.some(b => b.name === testBranchName)
  if (exists) {
    console.log(`  ⚠️  Branch '${testBranchName}' already exists, skipping creation`)
  } else {
    await createBranch(repo, testBranchName, 'HEAD', true)
    console.log(`  ✅ Created branch '${testBranchName}'`)
  }

  // ── Rename the branch ──
  const renamedName = `${testBranchName}-renamed`
  console.log(`\n── Renaming branch to: ${renamedName} ──`)

  const createdBranch = (await getBranches(repo)).find(
    b => b.name === testBranchName
  )
  if (createdBranch) {
    await renameBranch(repo, createdBranch, renamedName)
    console.log(`  ✅ Renamed '${testBranchName}' → '${renamedName}'`)
  } else {
    console.log(`  ⚠️  Branch '${testBranchName}' not found, checking for renamed version`)
  }

  // ── Clean up: delete the test branch ──
  const branchToDelete = (await getBranches(repo)).find(
    b => b.name === renamedName || b.name === testBranchName
  )

  if (branchToDelete && branchToDelete.type === BranchType.Local) {
    console.log(`\n── Deleting branch: ${branchToDelete.name} ──`)
    await deleteLocalBranch(repo, branchToDelete.name)
    console.log(`  ✅ Deleted branch '${branchToDelete.name}'`)
  }

  console.log('\n✅ Branch operations complete')
}

main().catch(err => {
  if (err instanceof GitError) {
    console.error(`\n❌ Git error [${err.result.gitError ?? 'UNKNOWN'}]: ${err.message}`)
  } else {
    console.error('Error:', err)
  }
  process.exit(1)
})
