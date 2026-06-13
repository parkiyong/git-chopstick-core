/**
 * Example: Use spawnGit with progress parsers for clone, fetch, push, pull.
 *
 * This shows how to wire spawnGit (stream-based child process) to the
 * CheckoutProgressParser, FetchProgressParser, PushProgressParser,
 * PullProgressParser, and CloneProgressParser to get live progress
 * updates during long-running operations.
 *
 * Usage:
 *   bun examples/spawn-git-progress.ts <path-to-repo>
 *   npx tsx examples/spawn-git-progress.ts <path-to-repo>
 */

import { spawnGit } from '../src/git/index.js'
import {
  executionOptionsWithProgress,
  CloneProgressParser,
  FetchProgressParser,
  PushProgressParser,
  PullProgressParser,
  CheckoutProgressParser,
} from '../src/lib/progress/index.js'
import type { IGitOutput } from '../src/lib/progress/index.js'

function onProgress(progress: IGitOutput) {
  if (progress.kind === 'progress') {
    const bar = '█'.repeat(Math.floor(progress.percent / 5))
    const space = ' '.repeat(20 - Math.floor(progress.percent / 5))
    process.stdout.write(
      `\r  ${bar}${space} ${progress.percent}% — ${progress.details?.text ?? ''}`
    )
  } else if (progress.kind === 'context') {
    process.stdout.write(`\n  ${progress.text}\n`)
  }
}

/**
 * Clone a repo with live progress using CloneProgressParser + spawnGit.
 */
async function cloneWithProgress(url: string, dest: string) {
  console.log(`\nCloning ${url}...`)

  const opts = await executionOptionsWithProgress(
    {},
    new CloneProgressParser(),
    onProgress
  )

  const child = spawnGit(['clone', url, dest], process.cwd(), 'clone', opts)

  return new Promise<void>((resolve, reject) => {
    child.on('close', code => {
      process.stdout.write('\n')
      if (code === 0) resolve()
      else reject(new Error(`clone exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

/**
 * Fetch from a remote with live progress using FetchProgressParser.
 */
async function fetchWithProgress(repoPath: string, remote = 'origin') {
  console.log(`\nFetching from '${remote}'...`)

  const opts = await executionOptionsWithProgress(
    {},
    new FetchProgressParser(),
    onProgress
  )

  const child = spawnGit(
    ['fetch', '--progress', remote],
    repoPath,
    'fetch',
    opts
  )

  return new Promise<void>((resolve, reject) => {
    child.on('close', code => {
      process.stdout.write('\n')
      if (code === 0) resolve()
      else reject(new Error(`fetch exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

/**
 * Push to a remote with live progress using PushProgressParser.
 */
async function pushWithProgress(repoPath: string, remote = 'origin', branch = 'main') {
  console.log(`\nPushing to '${remote}/${branch}'...`)

  const opts = await executionOptionsWithProgress(
    {},
    new PushProgressParser(),
    onProgress
  )

  const child = spawnGit(
    ['push', '--progress', remote, branch],
    repoPath,
    'push',
    opts
  )

  return new Promise<void>((resolve, reject) => {
    child.on('close', code => {
      process.stdout.write('\n')
      if (code === 0) resolve()
      else reject(new Error(`push exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

/**
 * Pull from a remote with live progress using PullProgressParser.
 * Also demonstrates using CheckoutProgressParser for the checkout phase.
 */
async function pullWithProgress(repoPath: string, remote = 'origin') {
  console.log(`\nPulling from '${remote}'...`)

  const opts = await executionOptionsWithProgress(
    {},
    new PullProgressParser(),
    onProgress
  )

  const child = spawnGit(
    ['pull', '--progress', remote],
    repoPath,
    'pull',
    opts
  )

  return new Promise<void>((resolve, reject) => {
    child.on('close', code => {
      process.stdout.write('\n')
      if (code === 0) resolve()
      else reject(new Error(`pull exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'clone': {
      const url = args[1]
      const dest = args[2]
      if (!url || !dest) {
        console.error('Usage: bun examples/spawn-git-progress.ts clone <url> <dest>')
        process.exit(1)
      }
      await cloneWithProgress(url, dest)
      break
    }
    case 'fetch': {
      const path = args[1] || process.cwd()
      const remote = args[2] || 'origin'
      await fetchWithProgress(path, remote)
      break
    }
    case 'push': {
      const path = args[1] || process.cwd()
      const remote = args[2] || 'origin'
      const branch = args[3] || 'main'
      await pushWithProgress(path, remote, branch)
      break
    }
    case 'pull': {
      const path = args[1] || process.cwd()
      const remote = args[2] || 'origin'
      await pullWithProgress(path, remote)
      break
    }
    default:
      console.log(`
Usage: bun examples/spawn-git-progress.ts <command> [args]

Commands:
  clone <url> <dest>   Clone a repo with live progress
  fetch [path] [remote]  Fetch with live progress
  push [path] [remote] [branch]  Push with live progress
  pull [path] [remote]  Pull with live progress

Examples:
  bun examples/spawn-git-progress.ts clone https://github.com/user/repo.git /tmp/repo
  bun examples/spawn-git-progress.ts fetch /my/repo origin
  bun examples/spawn-git-progress.ts push /my/repo origin main
`)
  }
}

main().catch(err => {
  console.error('\nError:', err.message || err)
  process.exit(1)
})
