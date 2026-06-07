interface IProgress {
  readonly value: number
  readonly title?: string
  readonly description?: string
}

export interface IGenericProgress extends IProgress {
  kind: 'generic'
}

export interface ICheckoutProgress extends IProgress {
  kind: 'checkout'
  readonly target: string
  readonly description: string
}

export interface IFetchProgress extends IProgress {
  kind: 'fetch'
  readonly remote: string
}

export interface IPullProgress extends IProgress {
  kind: 'pull'
  readonly remote: string
}

export interface IPushProgress extends IProgress {
  kind: 'push'
  readonly remote: string
  readonly branch: string
}

export interface ICloneProgress extends IProgress {
  kind: 'clone'
}

export interface IRevertProgress extends IProgress {
  kind: 'revert'
}

export interface IMultiCommitOperationProgress extends IProgress {
  readonly kind: 'multiCommitOperation'
  readonly currentCommitSummary: string
  readonly position: number
  readonly totalCommitCount: number
}

export type Progress =
  | IGenericProgress
  | ICheckoutProgress
  | IFetchProgress
  | IPullProgress
  | IPushProgress
  | IRevertProgress
  | IMultiCommitOperationProgress

export function clampProgress<T extends Progress>(
  minimum: number,
  maximum: number,
  progressCallback: (progress: T) => void
): (progress: T) => void {
  return (progress: T) =>
    progressCallback({
      ...progress,
      value: minimum + progress.value * (maximum - minimum),
    })
}
