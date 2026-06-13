import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  Repository, getStatus, getCommits, getBranches,
  createCommit, createBranch, deleteLocalBranch, renameBranch,
  getCurrentBranch, getRepositoryType,
} from '../index.js'

let repoPath: string
let repo: Repository

function git(args: string) {
  execSync(`git ${args}`, { cwd: repoPath, stdio: 'pipe' })
}

function writeFile(path: string, content: string) {
  writeFileSync(join(repoPath, path), content)
}

beforeAll(() => {
  repoPath = mkdtempSync(join(tmpdir(), 'gcctest-'))
  git('init -q')
  git('config user.email test@test.test')
  git('config user.name Test')

  // Create an initial commit so we have history for detached HEAD tests
  writeFile('README.md', '# test')
  git('add README.md')
  git('commit -m "initial"')

  repo = new Repository(repoPath)
})

describe('getRepositoryType', () => {
  it('returns regular for a valid repo', async () => {
    const type = await getRepositoryType(repoPath)
    expect(type.kind).toBe('regular')
    if (type.kind === 'regular') {
      expect(type.topLevelWorkingDirectory).toBe(repoPath)
    }
  })

  it('returns missing for a non-existent path', async () => {
    const type = await getRepositoryType('/nonexistent/path')
    expect(type.kind).toBe('missing')
  })
})

describe('getCurrentBranch', () => {
  it('returns the current branch name', async () => {
    const branch = await getCurrentBranch(repoPath)
    expect(branch).toBeTruthy()
    expect(typeof branch).toBe('string')
  })

  it('returns undefined when HEAD is detached', async () => {
    git('checkout --detach')
    const branch = await getCurrentBranch(repoPath)
    expect(branch).toBeUndefined()
    // Reset back to a branch for subsequent tests
    git('checkout -')
  })
})

describe('getStatus', () => {
  it('returns a status with branch info', async () => {
    const status = await getStatus(repo)
    expect(status).toBeTruthy()
    expect(status!.currentBranch).toBeTruthy()
    expect(typeof status!.currentBranch).toBe('string')
  })

  it('detects untracked files', async () => {
    writeFile('untracked.txt', 'hello')
    const status = await getStatus(repo)
    expect(status!.workingDirectory.files.length).toBeGreaterThanOrEqual(1)
    const untracked = status!.workingDirectory.files.find(
      f => f.path === 'untracked.txt'
    )
    expect(untracked).toBeTruthy()
  })

  it('returns null for a path that exists but is not a git repo', async () => {
    const nonRepoPath = mkdtempSync(join(tmpdir(), 'gcctest-nonrepo-'))
    const result = await getStatus(new Repository(nonRepoPath))
    expect(result).toBeNull()
    execSync(`rm -rf ${nonRepoPath}`)
  })
})

describe('getCommits', () => {
  it('returns commits in order', async () => {
    // Create another commit so we have history to read
    writeFile('commits-test.txt', 'data')
    git('add commits-test.txt')
    git('commit -m "test commit for getCommits"')

    const commits = await getCommits(repo, 'HEAD', 10)
    expect(commits.length).toBeGreaterThanOrEqual(1)
    expect(commits[0].summary).toBe('test commit for getCommits')
    expect(commits[0].sha).toBeTruthy()
    expect(commits[0].author).toBeTruthy()
  })
})

describe('Branch operations', () => {
  it('creates, lists, renames, and deletes branches', async () => {
    // Create a branch
    await createBranch(repo, 'test-feature', 'HEAD')
    let branches = await getBranches(repo)
    const names = branches.map(b => b.name)
    expect(names).toContain('test-feature')

    // Rename the branch
    const featureBranch = branches.find(b => b.name === 'test-feature')!
    await renameBranch(repo, featureBranch, 'test-feature-renamed')
    branches = await getBranches(repo)
    expect(branches.map(b => b.name)).toContain('test-feature-renamed')
    expect(branches.map(b => b.name)).not.toContain('test-feature')

    // Delete the branch
    await deleteLocalBranch(repo, 'test-feature-renamed')
    branches = await getBranches(repo)
    expect(branches.map(b => b.name)).not.toContain('test-feature-renamed')
  })
})

describe('createCommit', () => {
  it('creates a commit with files', async () => {
    writeFile('commit-test.txt', 'commit data')
    git('add commit-test.txt')

    const status = await getStatus(repo)
    const files = status!.workingDirectory.files.filter(
      f => f.path === 'commit-test.txt'
    )

    const sha = await createCommit(repo, 'feat: add commit-test.txt', files)
    expect(sha).toBeTruthy()
    // createCommit returns the abbreviated SHA from git commit output (7+ chars)
    expect(sha.length).toBeGreaterThanOrEqual(7)

    // Verify the commit exists — the full SHA from getCommits should start
    // with the abbreviated SHA returned by createCommit
    const commits = await getCommits(repo, 'HEAD', 5)
    expect(commits[0].sha.startsWith(sha)).toBe(true)
    expect(commits[0].summary).toBe('feat: add commit-test.txt')
  })
})

afterAll(() => {
  execSync(`rm -rf ${repoPath}`)
})
