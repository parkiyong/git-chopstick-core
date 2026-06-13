import { git } from './core.js'
import { Repository } from '../models/repository.js'

/**
 * Clean untracked files from the repository.
 */
export async function cleanUntrackedFiles(repository: Repository) {
  await git(['clean', '-d', '--force'], repository.path, 'cleanUntrackedFiles')
}
