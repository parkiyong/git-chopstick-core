import { IGitExecutionOptions } from '../../git/core.js'
import type { IGitOutput } from './index.js'

/**
 * Wraps git execution options with a `processCallback` that intercepts
 * stderr output and feeds progress lines to the provided parser.
 *
 * Git writes progress updates to stderr using carriage return (`\r`) to
 * overwrite the current line, producing output like:
 *   Receiving objects:  15% (150/1000)
 *   Resolving deltas: 100% (2145/2145), done.
 *
 * This function:
 * 1. Buffers stderr chunks split on `\r` to extract individual progress lines
 * 2. Feeds each line to the parser, which extracts percentage + description
 * 3. Calls the progress callback with the parsed result
 * 4. Chains to any existing processCallback set on the options
 */
export async function executionOptionsWithProgress(
  options: IGitExecutionOptions,
  parser: { parse: (line: string) => IGitOutput | null },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  progressCallback: (progress: any) => void
): Promise<IGitExecutionOptions> {
  return {
    ...options,
    processCallback: (process: any) => {
      // Chain to any existing processCallback (e.g. from core.ts)
      options.processCallback?.(process)

      // Buffer for stderr chunks — git progress lines are terminated by \r
      let buffer = ''

      process.stderr?.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()

        // Split on \r to get individual progress lines
        const lines = buffer.split('\r')
        // Keep any incomplete trailing data in the buffer for the next chunk
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          const output = parser.parse(trimmed)
          if (output !== null) {
            progressCallback(output)
          }
        }
      })
    },
  }
}
