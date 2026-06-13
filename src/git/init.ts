import { getDefaultBranch } from '../lib/helpers/default-branch.js'
import { git } from './core.js'

/** Init a new git repository in the given path. */
export async function initGitRepository(path: string): Promise<void> {
  await git(
    ['-c', `init.defaultBranch=${await getDefaultBranch()}`, 'init'],
    path,
    'initGitRepository'
  )
}
