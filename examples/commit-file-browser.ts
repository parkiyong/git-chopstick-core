/**
 * Example: Browse a repository's file tree at any commit.
 *
 * Lists recent commits, shows files changed in each, and lets you
 * view file contents at a specific commit using getFileAtCommit and
 * getChangedFilesFlat.
 *
 * Usage:
 *   npx tsx examples/commit-file-browser.ts /path/to/repo [commit-sha]
 *   bun examples/commit-file-browser.ts /path/to/repo [commit-sha]
 *
 * If no commit SHA is given, the 10 most recent commits are listed.
 * Use a short SHA (7+ chars) or full SHA to drill into a specific commit.
 */

import {
  Repository,
  getCommits,
  getCommit,
  getChangedFilesFlat,
  getFileAtCommit,
  GitError,
  GitErrorCodes,
} from '../src/index.js'

// ── Helpers ──

const STATUS_ICONS: Record<string, string> = {
  Added: '🆕',
  Modified: '📝',
  Deleted: '🗑️',
  Renamed: '📎',
  Copied: '📋',
  Conflicted: '⚠️',
  Untracked: '❓',
}

/** Map AppFileStatusKind values directly to display labels (avoids fake-object casts). */
const STATUS_LABELS: Record<string, string> = {
  New: 'Added',
  Modified: 'Modified',
  Deleted: 'Deleted',
  Renamed: 'Renamed',
  Copied: 'Copied',
  Conflicted: 'Conflicted',
  Untracked: 'Untracked',
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Main ──

async function main() {
  const repoPath = process.argv[2]
  const targetSha = process.argv[3]

  if (!repoPath) {
    console.error('Usage: npx tsx examples/commit-file-browser.ts <path-to-repo> [commit-sha]')
    process.exit(1)
  }

  const repo = new Repository(repoPath, 1)
  console.log(`\n📂 Repository: ${repo.name}`)
  console.log(`   Path: ${repo.path}\n`)

  // ── Get the target commit ──
  let sha = targetSha

  if (!sha) {
    // No SHA provided — list recent commits
    console.log('── Recent commits ──\n')

    const commits = await getCommits(repo, undefined, 10)

    if (commits.length === 0) {
      console.log('  No commits found in this repository.')
      process.exit(0)
    }

    for (const commit of commits) {
      const refs = commit.tags.length > 0 ? ` (${commit.tags.join(', ')})` : ''
      console.log(
        `  ${commit.shortSha}  ${truncate(commit.summary, 72)}${refs}`
      )
      console.log(
        `       ${commit.author.name}  —  ${formatDate(commit.author.date.getTime())}`
      )
    }

    console.log('\n💡 Re-run with a commit SHA to browse its files:')
    console.log(`   npx tsx examples/commit-file-browser.ts ${repoPath} <sha>`)
    process.exit(0)
  }

  // ── Resolve the SHA (accepts short SHAs) ──
  // getCommit resolves via git log so short SHAs work
  const commit = await getCommit(repo, sha)

  if (!commit) {
    console.error(`❌ Commit '${sha}' not found in this repository.`)
    process.exit(1)
  }

  console.log(`── Commit ${commit.sha} ──\n`)
  console.log(`  SHA:        ${commit.sha}`)
  console.log(`  Short SHA:  ${commit.shortSha}`)
  console.log(`  Author:     ${commit.author.name} <${commit.author.email}>`)
  console.log(`  Date:       ${formatDate(commit.author.date.getTime())}`)
  console.log(`  Summary:    ${commit.summary}`)

  if (commit.body.length > 0) {
    console.log(`  Body:`)
    for (const line of commit.body.split('\n')) {
      console.log(`    ${line}`)
    }
  }

  if (commit.tags.length > 0) {
    console.log(`  Tags:       ${commit.tags.join(', ')}`)
  }

  // ── Changed files (flat variant) ──
  console.log(`\n── Changed files ──\n`)

  let changedFiles: Awaited<ReturnType<typeof getChangedFilesFlat>>

  try {
    changedFiles = await getChangedFilesFlat(repo, commit.sha)
  } catch (err) {
    console.error('  ❌ Could not retrieve changed files:', (err as Error).message)
    process.exit(1)
  }

  if (changedFiles.length === 0) {
    console.log('  (No files changed — root commit or merge with no diff)')
  } else {
    // Group by status kind
    const byStatus = new Map<string, typeof changedFiles>()
    for (const f of changedFiles) {
      const label = STATUS_LABELS[f.statusKind] ?? f.statusKind
      const list = byStatus.get(label) ?? []
      list.push(f)
      byStatus.set(label, list)
    }

    for (const [label, files] of byStatus) {
      const icon = STATUS_ICONS[label] ?? '❓'
      console.log(`  ${icon} ${label} (${files.length}):`)
      for (const f of files) {
        const oldPath = f.oldPath ? ` (was: ${f.oldPath})` : ''
        console.log(`     - ${f.path}${oldPath}`)
      }
    }
  }

  // ── Browse file contents at this commit ──
  console.log(`\n── File contents ──\n`)

  if (changedFiles.length === 0) {
    console.log('  (No files to display)')
  } else {
    // Show content of each changed file at this commit
    // Skip deleted files since they don't exist at this commit
    const browsableFiles = changedFiles.filter(
      f => f.statusKind !== 'Deleted'
    )

    if (browsableFiles.length === 0) {
      console.log('  (All files were deleted — nothing to show)')
    } else {
      const textSizes: string[] = []

      for (const file of browsableFiles) {
        const label = STATUS_LABELS[file.statusKind] ?? file.statusKind
        const icon = STATUS_ICONS[label] ?? '📄'
        console.log(`  ${icon} ${file.path}`)

        try {
          const content = await getFileAtCommit(repo.path, commit.sha, file.path)

          // Track text file sizes for summary (single pass)
          const isLikelyBinary = content.slice(0, 8192).includes('\0')
          if (!isLikelyBinary) {
            textSizes.push(`${file.path}: ${content.length.toLocaleString()} chars`)
          }

          if (isLikelyBinary) {
            console.log(`     [binary — ${content.length.toLocaleString()} bytes]\n`)
          } else {
            const lines = content.split('\n')
            // Show first 15 lines with line numbers
            const previewLines = lines.slice(0, 15)
            const isTruncated = lines.length > 15

            for (let i = 0; i < previewLines.length; i++) {
              const lineNum = (i + 1).toString().padStart(4, ' ')
              console.log(`     ${lineNum}│ ${previewLines[i]}`)
            }

            if (isTruncated) {
              console.log(`     … (${lines.length - 15} more lines, ${content.length.toLocaleString()} total chars)`)
            } else if (lines.length === 1 && lines[0] === '') {
              console.log('     (empty file)')
            }
            console.log()
          }
        } catch (err) {
          console.log(`     ❌ ${(err as any)?.message ?? String(err)}\n`)
        }
      }

      // ── Summary stats (sizes collected during content pass) ──
      console.log(`── Summary ──\n`)
      console.log(`  Total files changed: ${changedFiles.length}`)
      if (textSizes.length > 0) {
        console.log(`  File sizes (text only):`)
        for (const s of textSizes) {
          console.log(`    ${s}`)
        }
      }
    }
  }
}

main().catch(err => {
  if (err instanceof GitError) {
    console.error(`\n❌ Git error [${err.result.gitError ?? 'UNKNOWN'}]: ${err.message}`)
    switch (err.result.gitError) {
      case GitErrorCodes.NotAGitRepository:
        console.error('   The path is not a valid git repository.')
        break
      case GitErrorCodes.BadRevision:
        console.error('   The commit SHA could not be resolved.')
        break
    }
  } else {
    console.error('\n❌ Error:', (err as any)?.message ?? String(err))
  }
  process.exit(1)
})
