export enum DiffSelectionType {
  All = 'All',
  Partial = 'Partial',
  None = 'None',
}

function typeMatchesSelection(
  selectionType: DiffSelectionType,
  selected: boolean
): boolean {
  switch (selectionType) {
    case DiffSelectionType.All:
      return selected
    case DiffSelectionType.None:
      return !selected
    case DiffSelectionType.Partial:
      return false
  }
}

export class DiffSelection {
  public static fromInitialSelection(
    initialSelection: DiffSelectionType.All | DiffSelectionType.None
  ): DiffSelection {
    return new DiffSelection(initialSelection, null, null)
  }

  private constructor(
    private readonly defaultSelectionType: DiffSelectionType.All | DiffSelectionType.None,
    private readonly divergingLines: Set<number> | null = null,
    private readonly selectableLines: Set<number> | null = null
  ) {}

  public getSelectionType(): DiffSelectionType {
    const divergingLines = this.divergingLines
    const selectableLines = this.selectableLines

    if (!divergingLines || divergingLines.size === 0) {
      return this.defaultSelectionType
    }

    if (selectableLines && selectableLines.size === divergingLines.size) {
      const allSelectableLinesAreDivergent = [...selectableLines].every(i =>
        divergingLines.has(i)
      )
      if (allSelectableLinesAreDivergent) {
        return this.defaultSelectionType === DiffSelectionType.All
          ? DiffSelectionType.None
          : DiffSelectionType.All
      }
    }

    return DiffSelectionType.Partial
  }

  public isSelected(lineIndex: number): boolean {
    const lineIsDivergent =
      !!this.divergingLines && this.divergingLines.has(lineIndex)

    if (this.defaultSelectionType === DiffSelectionType.All) {
      return !lineIsDivergent
    }
    return lineIsDivergent
  }

  public isRangeSelected(from: number, length: number): DiffSelectionType {
    if (length <= 0) return DiffSelectionType.None

    const computedSelectionType = this.getSelectionType()
    if (computedSelectionType !== DiffSelectionType.Partial) {
      return computedSelectionType
    }

    if (length === 1) {
      return this.isSelected(from) ? DiffSelectionType.All : DiffSelectionType.None
    }

    const to = from + length
    let foundSelected = false
    let foundDeselected = false
    for (let i = from; i < to; i++) {
      if (this.isSelected(i)) foundSelected = true
      if (!this.isSelected(i)) foundDeselected = true
      if (foundSelected && foundDeselected) return DiffSelectionType.Partial
    }

    return foundSelected ? DiffSelectionType.All : DiffSelectionType.None
  }

  public isSelectable(lineIndex: number): boolean {
    return this.selectableLines ? this.selectableLines.has(lineIndex) : true
  }

  public withLineSelection(lineIndex: number, selected: boolean): DiffSelection {
    return this.withRangeSelection(lineIndex, 1, selected)
  }

  public withRangeSelection(from: number, length: number, selected: boolean): DiffSelection {
    const computedSelectionType = this.getSelectionType()
    const to = from + length

    if (typeMatchesSelection(computedSelectionType, selected)) {
      return this
    }

    if (computedSelectionType === DiffSelectionType.Partial) {
      const newDivergingLines = new Set<number>(this.divergingLines!)

      if (typeMatchesSelection(this.defaultSelectionType, selected)) {
        for (let i = from; i < to; i++) {
          newDivergingLines.delete(i)
        }
      } else {
        for (let i = from; i < to; i++) {
          if (this.isSelectable(i)) {
            newDivergingLines.add(i)
          }
        }
      }

      return new DiffSelection(
        this.defaultSelectionType,
        newDivergingLines.size === 0 ? null : newDivergingLines,
        this.selectableLines
      )
    }

    const newDivergingLines = new Set<number>()
    for (let i = from; i < to; i++) {
      if (this.isSelectable(i)) {
        newDivergingLines.add(i)
      }
    }

    return new DiffSelection(
      computedSelectionType,
      newDivergingLines,
      this.selectableLines
    )
  }

  public withToggleLineSelection(lineIndex: number): DiffSelection {
    return this.withLineSelection(lineIndex, !this.isSelected(lineIndex))
  }

  public withSelectAll(): DiffSelection {
    return new DiffSelection(DiffSelectionType.All, null, this.selectableLines)
  }

  public withSelectNone(): DiffSelection {
    return new DiffSelection(DiffSelectionType.None, null, this.selectableLines)
  }

  public withSelectableLines(selectableLines: Set<number>) {
    const divergingLines = this.divergingLines
      ? new Set([...this.divergingLines].filter(x => selectableLines.has(x)))
      : null

    return new DiffSelection(
      this.defaultSelectionType,
      divergingLines,
      selectableLines
    )
  }
}
