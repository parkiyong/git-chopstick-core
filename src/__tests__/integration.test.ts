import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  Repository, getStatus, getCommits, getBranches,
  createCommit, createBranch, deleteLocalBranch, renameBranch,
  getCurrentBranch, getRepositoryType, getRepositorySummary,
  getRemoteUrl, getRemotesFromPath, getAllTags,
  addRemote, removeRemote, setRemoteURL,
  merge, MergeResult,
  rebase, RebaseResult,
  getStashes, getStashesByPath,
  createDesktopStashEntry, popStashEntry,
  getTags, getFileAtCommit,
  getChangedFilesFlat, getChangedFiles,
  appFileStatusToString, AppFileStatusKind,
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

  // Set a remote URL so getRemoteUrl / getRemotesFromPath have a known value
  // (the bundle clone already creates an origin remote pointing to the bundle file)
  git(repoPath, 'remote set-url origin https://github.com/user/repo.git')
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

  it('getTags returns the same tags as getAllTags', async () => {
    const tags = await getTags(repoPath)
    expect(tags.length).toBeGreaterThanOrEqual(1)

    const v010 = tags.find(t => t.name === 'v0.1.0')
    expect(v010).toBeTruthy()
    expect(v010!.sha).toMatch(/^[a-f0-9]{40}$/)

    // Verify consistency with getAllTags
    const allTags = await getAllTags(repo)
    expect(tags.length).toBe(allTags.size)
    for (const t of tags) {
      expect(allTags.get(t.name)).toBe(t.sha)
    }
  })

  it('getTags returns empty array for a tag-less repo', async () => {
    const noTagPath = mkdtempSync(join(tmpdir(), 'gcctest-notags-'))
    execSync(`git init ${noTagPath}`, { stdio: 'pipe' })
    execSync(
      `git -C ${noTagPath} commit --allow-empty -m 'init'`,
      { stdio: 'pipe' }
    )
    const tags = await getTags(noTagPath)
    expect(tags).toEqual([])
    execSync(`rm -rf ${noTagPath}`)
  })

  it('getTags returns empty array for a non-repo path', async () => {
    const nonRepoPath = mkdtempSync(join(tmpdir(), 'gcctest-nonrepo-'))
    const tags = await getTags(nonRepoPath)
    expect(tags).toEqual([])
    execSync(`rm -rf ${nonRepoPath}`)
  })
})

describe('getFileAtCommit', () => {
  it('reads README.md at HEAD', async () => {
    const content = await getFileAtCommit(repoPath, 'HEAD', 'README.md')
    expect(content).toContain('# Test Repo')
  })

  it('reads a file at the initial commit', async () => {
    const commits = await getCommits(repo, 'HEAD', 10)
    const initialSha = commits[commits.length - 1].sha
    const content = await getFileAtCommit(repoPath, initialSha, 'README.md')
    expect(content).toContain('# Test Repo')
  })

  it('reads src/index.js at a commit where it exists', async () => {
    // The second commit adds src/index.js with 'console.log("hi")'
    const commits = await getCommits(repo, 'HEAD', 10)
    // Second-to-last commit has the initial version
    const secondCommit = commits[commits.length - 2].sha
    const content = await getFileAtCommit(repoPath, secondCommit, 'src/index.js')
    expect(content.trim()).toBe('console.log("hi")')
  })

  it('throws for a file that does not exist at the given commit', async () => {
    await expect(
      getFileAtCommit(repoPath, 'HEAD', 'nonexistent-file.txt')
    ).rejects.toThrow()
  })
})

describe('getChangedFilesFlat', () => {
  it('returns flat file changes for the merge commit', async () => {
    const commits = await getCommits(repo, 'HEAD', 10)
    // The merge commit merged feature/one (which added feature-one.txt)
    const mergeSha = commits[0].sha
    const flat = await getChangedFilesFlat(repo, mergeSha)

    expect(flat.length).toBeGreaterThanOrEqual(1)

    // Each entry should have path and statusKind
    for (const f of flat) {
      expect(f).toHaveProperty('path')
      expect(f).toHaveProperty('statusKind')
      expect(Object.values(AppFileStatusKind)).toContain(f.statusKind)
      // oldPath should only be present for Renamed/Copied files
      if (f.statusKind === AppFileStatusKind.Renamed || f.statusKind === AppFileStatusKind.Copied) {
        expect(f.oldPath).toBeTruthy()
      } else {
        expect(f.oldPath).toBeUndefined()
      }
    }
  })

  it('matches structure from getChangedFiles', async () => {
    const commits = await getCommits(repo, 'HEAD', 10)
    const mergeSha = commits[0].sha

    const [flat, full] = await Promise.all([
      getChangedFilesFlat(repo, mergeSha),
      getChangedFiles(repo, mergeSha),
    ])

    expect(flat.length).toBe(full.files.length)

    for (let i = 0; i < flat.length; i++) {
      expect(flat[i].path).toBe(full.files[i].path)
      expect(flat[i].statusKind).toBe(full.files[i].status.kind)

      if (
        full.files[i].status.kind === AppFileStatusKind.Renamed ||
        full.files[i].status.kind === AppFileStatusKind.Copied
      ) {
        expect(flat[i].oldPath).toBe(full.files[i].status.oldPath)
      }
    }
  })

  it('throws for an unborn HEAD', async () => {
    const unbornPath = mkdtempSync(join(tmpdir(), 'gcctest-unborn-'))
    execSync(`git init ${unbornPath}`, { stdio: 'pipe' })
    const unbornRepo = new Repository(unbornPath, 1)
    // Cannot get changed files for a commit that doesn't exist
    await expect(
      getChangedFilesFlat(unbornRepo, 'HEAD')
    ).rejects.toThrow()
    execSync(`rm -rf ${unbornPath}`)
  })
})

describe('getStashesByPath', () => {
  it('returns empty stashes when no stash exists', async () => {
    const result = await getStashesByPath(repoPath)
    expect(result.desktopEntries).toEqual([])
    expect(result.stashEntryCount).toBe(0)
  })

  it('returns same result as getStashes after creating a stash', async () => {
    // Create a working directory change
    writeFileSync(join(repoPath, 'stash-by-path-test.txt'), 'stash me')
    git(repoPath, 'add stash-by-path-test.txt')

    await createDesktopStashEntry(repo, 'main', [], null)

    const byPath = await getStashesByPath(repoPath)
    const byRepo = await getStashes(repo)

    expect(byPath.desktopEntries.length).toBe(byRepo.desktopEntries.length)
    expect(byPath.stashEntryCount).toBe(byRepo.stashEntryCount)

    // Verify the entry has expected fields
    const entry = byPath.desktopEntries[0]
    expect(entry.branchName).toBe('main')
    expect(entry.stashSha).toMatch(/^[a-f0-9]{40}$/)

    // Clean up: pop the stash, unstage, and remove the test file
    await popStashEntry(repo, entry.stashSha)
    git(repoPath, 'reset HEAD -- stash-by-path-test.txt')
    execSync(`rm -f ${join(repoPath, 'stash-by-path-test.txt')}`)
  })

  it('returns empty for a non-repo path', async () => {
    const nonRepoPath = mkdtempSync(join(tmpdir(), 'gcctest-nonrepo-'))
    const result = await getStashesByPath(nonRepoPath)
    expect(result.desktopEntries).toEqual([])
    expect(result.stashEntryCount).toBe(0)
    execSync(`rm -rf ${nonRepoPath}`)
  })
})

describe('appFileStatusToString', () => {
  it('maps each status kind to a human-readable string', () => {
    expect(appFileStatusToString({ kind: AppFileStatusKind.New })).toBe('Added')
    expect(appFileStatusToString({ kind: AppFileStatusKind.Modified })).toBe('Modified')
    expect(appFileStatusToString({ kind: AppFileStatusKind.Deleted })).toBe('Deleted')
    expect(appFileStatusToString({ kind: AppFileStatusKind.Renamed })).toBe('Renamed')
    expect(appFileStatusToString({ kind: AppFileStatusKind.Copied })).toBe('Copied')
    expect(appFileStatusToString({ kind: AppFileStatusKind.Conflicted })).toBe('Conflicted')
    expect(appFileStatusToString({ kind: AppFileStatusKind.Untracked })).toBe('Untracked')
  })
})

describe('getRepositorySummary', () => {
  it('returns path, head, and currentBranch for a normal repo', async () => {
    const summary = await getRepositorySummary(repoPath)
    expect(summary).toBeTruthy()
    expect(summary!.path).toBe(repoPath)
    // HEAD should be a 40-char hex SHA
    expect(summary!.head).toMatch(/^[a-f0-9]{40}$/)
    expect(summary!.currentBranch).toBe('main')
  })

  it('returns currentBranch as undefined when HEAD is detached', async () => {
    git(repoPath, 'checkout --detach')
    const summary = await getRepositorySummary(repoPath)
    expect(summary).toBeTruthy()
    expect(summary!.path).toBe(repoPath)
    expect(summary!.head).toMatch(/^[a-f0-9]{40}$/)
    expect(summary!.currentBranch).toBeUndefined()
    // Reset back for subsequent tests
    git(repoPath, 'checkout main')
  })

  it('returns null for a bare repository', async () => {
    const barePath = mkdtempSync(join(tmpdir(), 'gcctest-bare-'))
    execSync(`git init --bare ${barePath}`, { stdio: 'pipe' })
    const summary = await getRepositorySummary(barePath)
    expect(summary).toBeNull()
    execSync(`rm -rf ${barePath}`)
  })

  it('returns null for a non-existent path', async () => {
    const summary = await getRepositorySummary('/nonexistent/path')
    expect(summary).toBeNull()
  })

  it('returns null for a path that exists but is not a git repo', async () => {
    const nonRepoPath = mkdtempSync(join(tmpdir(), 'gcctest-nonrepo-'))
    const summary = await getRepositorySummary(nonRepoPath)
    expect(summary).toBeNull()
    execSync(`rm -rf ${nonRepoPath}`)
  })
})

describe('getRemoteUrl', () => {
  it('returns the URL for an existing remote', async () => {
    const url = await getRemoteUrl(repoPath, 'origin')
    expect(url).toBe('https://github.com/user/repo.git')
  })

  it('returns null for a non-existent remote', async () => {
    const url = await getRemoteUrl(repoPath, 'nonexistent')
    expect(url).toBeNull()
  })

  it('returns null for a non-repo path', async () => {
    const nonRepoPath = mkdtempSync(join(tmpdir(), 'gcctest-nonrepo-'))
    const url = await getRemoteUrl(nonRepoPath, 'origin')
    expect(url).toBeNull()
    execSync(`rm -rf ${nonRepoPath}`)
  })
})

describe('getRemotesFromPath', () => {
  it('lists all remotes for a valid repo', async () => {
    const remotes = await getRemotesFromPath(repoPath)
    expect(remotes.length).toBeGreaterThanOrEqual(1)
    const origin = remotes.find(r => r.name === 'origin')
    expect(origin).toBeTruthy()
    expect(origin!.url).toBe('https://github.com/user/repo.git')
  })

  it('returns an empty array for a non-repo path', async () => {
    const nonRepoPath = mkdtempSync(join(tmpdir(), 'gcctest-nonrepo-'))
    const remotes = await getRemotesFromPath(nonRepoPath)
    expect(remotes).toEqual([])
    execSync(`rm -rf ${nonRepoPath}`)
  })
})

describe('addRemote', () => {
  it('adds a new remote and returns it', async () => {
    const remote = await addRemote(repo, 'upstream', 'https://github.com/upstream/repo.git')
    expect(remote.name).toBe('upstream')
    expect(remote.url).toBe('https://github.com/upstream/repo.git')

    // Verify it was persisted
    const url = await getRemoteUrl(repoPath, 'upstream')
    expect(url).toBe('https://github.com/upstream/repo.git')
  })
})

describe('setRemoteURL', () => {
  it('updates the URL of an existing remote', async () => {
    const result = await setRemoteURL(repo, 'origin', 'https://github.com/user/new-repo.git')
    expect(result).toBe(true)

    // Verify it was changed
    const url = await getRemoteUrl(repoPath, 'origin')
    expect(url).toBe('https://github.com/user/new-repo.git')
  })
})

describe('removeRemote', () => {
  it('removes an existing remote silently', async () => {
    // First confirm the remote exists
    const beforeUrl = await getRemoteUrl(repoPath, 'upstream')
    expect(beforeUrl).toBe('https://github.com/upstream/repo.git')

    await removeRemote(repo, 'upstream')

    // Verify it's gone
    const afterUrl = await getRemoteUrl(repoPath, 'upstream')
    expect(afterUrl).toBeNull()
  })

  it('silently succeeds when removing a non-existent remote', async () => {
    // Should not throw
    await expect(removeRemote(repo, 'nonexistent')).resolves.toBeUndefined()
  })
})

describe('merge', () => {
  it('merges feature/two into main', async () => {
    const result = await merge(repo, 'feature/two')
    expect(result).toBe(MergeResult.Success)
  })

  it('returns AlreadyUpToDate when merging an already-merged branch', async () => {
    const result = await merge(repo, 'feature/two')
    expect(result).toBe(MergeResult.AlreadyUpToDate)
  })
})

describe('rebase', () => {
  it('rebases feature/two onto feature/one', async () => {
    // Get Branch objects with tip.sha required by the rebase API
    const branches = await getBranches(repo)
    const baseBranch = branches.find(b => b.nameWithoutRemote === 'feature/one')!
    const targetBranch = branches.find(b => b.nameWithoutRemote === 'feature/two')!
    expect(baseBranch).toBeTruthy()
    expect(targetBranch).toBeTruthy()

    const result = await rebase(repo, baseBranch, targetBranch)
    expect(result).toBe(RebaseResult.CompletedWithoutError)
  })
})

describe('stash', () => {
  it('creates a stash entry and pops it back', async () => {
    // Create a working directory change to stash
    writeFileSync(join(repoPath, 'stash-test.txt'), 'stash me')
    git(repoPath, 'add stash-test.txt')

    // Create a stash entry
    const created = await createDesktopStashEntry(repo, 'main', [], null)
    expect(created).toBe(true)

    // List stashes — should include our new entry
    const stashes = await getStashes(repo)
    expect(stashes.desktopEntries.length).toBeGreaterThanOrEqual(1)
    const stashSha = stashes.desktopEntries[0].stashSha
    expect(stashSha).toBeTruthy()

    // Pop it back — changes should be restored
    await popStashEntry(repo, stashSha)
    const statusAfterPop = await getStatus(repo)
    expect(statusAfterPop).toBeTruthy()
    const stashFile = statusAfterPop!.workingDirectory.files.find(
      f => f.path === 'stash-test.txt'
    )
    expect(stashFile).toBeTruthy()

    // Clean up: discard the restored file (stash pop restores to working tree, not index)
    git(repoPath, 'checkout -- stash-test.txt')
  })
})

afterAll(() => {
  cleanupFixtureRepo(repoPath)
})
