import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  Repository, getStatus, getCommits, getBranches,
  createCommit, createBranch, deleteLocalBranch, renameBranch,
  getCurrentBranch, getRepositoryType, getAllTags,
} from '../index.js'
import {
  setupFixtureRepo, cleanupFixtureRepo, git,
} from './fixture-helpers.js'

let repoPath: string
let repo: Repository

beforeAll(() => {
  const fixture = setupFixtureRepo()
  repoPath = fixture.repoPath
  repo = fixture.repo
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
    expect(branch).toBe('main')
  })

  it('returns undefined when HEAD is detached', async () => {
    git(repoPath, 'checkout --detach')
    const branch = await getCurrentBranch(repoPath)
    expect(branch).toBeUndefined()
    // Reset back to a branch for subsequent tests
    git(repoPath, 'checkout main')
  })
})

describe('getStatus', () => {
  it('returns a status with branch info', async () => {
    const status = await getStatus(repo)
    expect(status).toBeTruthy()
    expect(status!.currentBranch).toBe('main')
  })

  it('detects untracked files', async () => {
    writeFileSync(join(repoPath, 'untracked.txt'), 'hello')
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
  it('returns commits in order (fixture has 6 commits reachable from main)', async () => {
    const commits = await getCommits(repo, 'HEAD', 10)
    expect(commits.length).toBe(6)
    expect(commits[0].sha).toBeTruthy()
    expect(commits[0].author).toBeTruthy()
    // The most recent commit should be the merge
    expect(commits[0].summary).toBe('merge: feature/one into main')
    // The initial commit should be the last one
    expect(commits[5].summary).toBe('initial: add README and gitignore')
  })

  it('returns commits for feature/two branch', async () => {
    const commits = await getCommits(repo, 'feature/two', 10)
    expect(commits.length).toBeGreaterThanOrEqual(1)
    expect(commits[0].summary).toBe('feat: feature two')
  })
})

describe('Branch operations', () => {
  it('includes feature/one and feature/two', async () => {
    const branches = await getBranches(repo)
    const names = branches.map(b => b.nameWithoutRemote)
    expect(names).toContain('main')
    expect(names).toContain('feature/one')
    expect(names).toContain('feature/two')
  })

  it('creates, renames, and deletes a branch', async () => {
    await createBranch(repo, 'test-feature', 'HEAD')
    let branches = await getBranches(repo)
    const names = branches.map(b => b.nameWithoutRemote)
    expect(names).toContain('test-feature')

    // Rename the branch
    const featureBranch = branches.find(b => b.nameWithoutRemote === 'test-feature')!
    await renameBranch(repo, featureBranch, 'test-feature-renamed')
    branches = await getBranches(repo)
    expect(branches.map(b => b.nameWithoutRemote)).toContain('test-feature-renamed')
    expect(branches.map(b => b.nameWithoutRemote)).not.toContain('test-feature')

    // Delete the branch
    await deleteLocalBranch(repo, 'test-feature-renamed')
    branches = await getBranches(repo)
    expect(branches.map(b => b.nameWithoutRemote)).not.toContain('test-feature-renamed')
  })
})

describe('createCommit', () => {
  it('creates a commit with files', async () => {
    writeFileSync(join(repoPath, 'commit-test.txt'), 'commit data')
    git(repoPath, 'add commit-test.txt')

    const status = await getStatus(repo)
    const files = status!.workingDirectory.files.filter(
      f => f.path === 'commit-test.txt'
    )

    const sha = await createCommit(repo, 'feat: add commit-test.txt', files)
    expect(sha).toBeTruthy()
    expect(sha.length).toBeGreaterThanOrEqual(7)

    // Verify the commit exists
    const commits = await getCommits(repo, 'HEAD', 5)
    expect(commits[0].sha.startsWith(sha)).toBe(true)
    expect(commits[0].summary).toBe('feat: add commit-test.txt')
  })
})

describe('Tag operations', () => {
  it('lists tags from the fixture', async () => {
    const tags = await getAllTags(repo)
    expect(tags.size).toBeGreaterThanOrEqual(1)
    expect(tags.has('v0.1.0')).toBe(true)
  })
})

afterAll(() => {
  cleanupFixtureRepo(repoPath)
})
