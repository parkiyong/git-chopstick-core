/**
 * To rebuild the fixture bundle:
 *
 *   cd /tmp && rm -rf fixture-builder && mkdir fixture-builder && cd fixture-builder
 *   git init -q && git config user.email f@t.t && git config user.name F
 *   echo '# Test Repo' > README.md && echo 'node_modules/' > .gitignore
 *   git add .gitignore README.md && git commit -m 'initial: add README and gitignore'
 *   echo 'hello' > hello.txt && mkdir -p src && echo 'console.log("hi")' > src/index.js
 *   git add hello.txt src/index.js && git commit -m 'feat: add hello.txt and src/index.js'
 *   echo 'world' > hello.txt && echo 'console.log("hello world")' > src/index.js
 *   git add -A && git commit -m 'feat: update hello and src/index.js'
 *   git checkout -b feature/one && echo 'feature one content' > feature-one.txt
 *   git add feature-one.txt && git commit -m 'feat: feature one'
 *   git checkout main && echo 'another change' > another.txt
 *   git add another.txt && git commit -m 'feat: add another.txt'
 *   git merge feature/one --no-ff --no-edit -m 'merge: feature/one into main'
 *   git checkout -b feature/two && echo 'feature two content' > feature-two.txt
 *   git add feature-two.txt && git commit -m 'feat: feature two'
 *   git checkout main && git tag -a v0.1.0 -m 'v0.1.0'
 *   git bundle create test-repo.bundle --all
 *   cp test-repo.bundle <this-dir>/fixtures/
 *
 * This creates a bundle with 6 commits on main, 3 branches, and 1 annotated tag.
 */
import { mkdtempSync } from 'fs'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Repository } from '../models/repository.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Path to the pre-built fixture repo bundle.
 */
export const FIXTURE_BUNDLE_PATH = join(__dirname, 'fixtures', 'test-repo.bundle')

/**
 * Clone the fixture bundle to a temp directory, configure git identity,
 * create local branches for all remote-tracking branches, and return
 * the path and a Repository object.
 *
 * Use this in `beforeAll` for faster test setup — avoids creating a repo
 * from scratch for every test suite.
 */
export function setupFixtureRepo(): { repoPath: string; repo: Repository } {
  const repoPath = mkdtempSync(join(tmpdir(), 'gcctest-fixture-'))

  execSync(`git clone "${FIXTURE_BUNDLE_PATH}" "${repoPath}"`, {
    stdio: 'pipe',
  })

  execSync('git config user.email test@test.test', {
    cwd: repoPath,
    stdio: 'pipe',
  })
  execSync('git config user.name Test', {
    cwd: repoPath,
    stdio: 'pipe',
  })

  // Create local branches for all remote-tracking branches (bundle clones
  // only create a local branch for HEAD — everything else becomes origin/*)
  const localBranches = execSync(
    'git branch --format="%(refname:short)"',
    { cwd: repoPath, encoding: 'utf-8', stdio: 'pipe' }
  )
    .trim()
    .split('\n')
    .filter(Boolean)

  const remoteBranches = execSync(
    'git branch -r --format="%(refname:lstrip=3)"',
    { cwd: repoPath, encoding: 'utf-8', stdio: 'pipe' }
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter(b => b !== 'HEAD' && !localBranches.includes(b))

  for (const branch of remoteBranches) {
    execSync(`git branch --track "${branch}" "origin/${branch}"`, {
      cwd: repoPath,
      stdio: 'pipe',
    })
  }

  const repo = new Repository(repoPath)
  return { repoPath, repo }
}

/**
 * Run a git command in the fixture repo.
 */
export function git(repoPath: string, args: string) {
  execSync(`git ${args}`, { cwd: repoPath, stdio: 'pipe' })
}

/**
 * Clean up a fixture repo directory.
 */
export function cleanupFixtureRepo(repoPath: string) {
  execSync(`rm -rf ${repoPath}`)
}
