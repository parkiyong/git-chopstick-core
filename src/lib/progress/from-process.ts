import { ChildProcess } from 'child_process'
import { IGitExecutionOptions } from '../../git/core.js'

export async function executionOptionsWithProgress(
  options: IGitExecutionOptions,
  _parser: any,
  _progressCallback: (progress: any) => void
): Promise<IGitExecutionOptions> {
  return options
}
