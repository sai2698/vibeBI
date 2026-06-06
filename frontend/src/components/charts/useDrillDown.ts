import { useState, useCallback, useMemo, useEffect } from 'react';

export interface DrillLevel {
  /** The dimension that was active before drilling */
  fromDimension: string;
  /** The dimension we drilled into */
  toDimension: string;
  /** The filter column (the fromDimension column) */
  filterColumn: string;
  /** The value that was clicked to trigger drill */
  filterValue: string;
  /** Display label for breadcrumb */
  label: string;
}

export interface DrillDownState {
  /** Stack of drill levels (index 0 = first drill) */
  drillStack: DrillLevel[];
  /** Whether any drill is active */
  isDrilled: boolean;
  /** The current active dimension after all drills (null = use chart's original) */
  currentDimension: string | null;
  /** Computed filters from the full drill stack */
  drillFilters: Record<string, string | string[]>;
  /** Push a new drill level */
  drillDown: (fromDimension: string, toDimension: string, clickedValue: string) => void;
  /** Pop the last drill level */
  drillUp: () => void;
  /** Jump back to a specific level (0 = clear all) */
  drillToLevel: (level: number) => void;
  /** Clear all drill state */
  resetDrill: () => void;
  /** Add a filter-only entry (no dimension change) */
  filterByValue: (column: string, value: string | string[]) => void;
  /** Add an exclude filter */
  excludeValue: (column: string, value: string | string[]) => void;
}

export function useDrillDown(restoreAction?: { stack: DrillLevel[]; timestamp: number }): DrillDownState {
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([]);

  // Restore drill stack when an external action occurs (e.g. applying a saved view)
  useEffect(() => {
    if (restoreAction) {
      setDrillStack(restoreAction.stack || []);
    }
  }, [restoreAction?.timestamp]);

  const isDrilled = drillStack.length > 0;

  const currentDimension = useMemo(() => {
    if (drillStack.length === 0) return null;
    return drillStack[drillStack.length - 1].toDimension;
  }, [drillStack]);

  const drillFilters = useMemo(() => {
    const filters: Record<string, string | string[]> = {};
    drillStack.forEach((level) => {
      if (level.filterValue && level.filterColumn) {
        const existing = filters[level.filterColumn];
        if (existing !== undefined) {
          // If multiple filters apply to the same column, aggregate them into an array
          if (Array.isArray(existing)) {
            filters[level.filterColumn] = [...existing, ...(Array.isArray(level.filterValue) ? level.filterValue : [level.filterValue])];
          } else {
            filters[level.filterColumn] = [existing, ...(Array.isArray(level.filterValue) ? level.filterValue : [level.filterValue])];
          }
        } else {
          filters[level.filterColumn] = level.filterValue;
        }
      }
    });
    return filters;
  }, [drillStack]);

  const drillDown = useCallback(
    (fromDimension: string, toDimension: string, clickedValue: string) => {
      setDrillStack((prev) => [
        ...prev,
        {
          fromDimension,
          toDimension,
          filterColumn: fromDimension,
          filterValue: clickedValue,
          label: `${fromDimension}: ${clickedValue}`,
        },
      ]);
    },
    [],
  );

  const drillUp = useCallback(() => {
    setDrillStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const drillToLevel = useCallback((level: number) => {
    setDrillStack((prev) => prev.slice(0, level));
  }, []);

  const resetDrill = useCallback(() => {
    setDrillStack([]);
  }, []);

  const filterByValue = useCallback(
    (column: string, value: string | string[]) => {
      const labelValue = Array.isArray(value) ? `${value.length} items` : value;
      setDrillStack((prev) => [
        ...prev,
        {
          fromDimension: column,
          toDimension: prev.length > 0 ? prev[prev.length - 1].toDimension : column,
          filterColumn: column,
          filterValue: value as any,
          label: `${column} = ${labelValue}`,
        },
      ]);
    },
    [],
  );

  const excludeValue = useCallback(
    (column: string, value: string | string[]) => {
      const labelValue = Array.isArray(value) ? `${value.length} items` : value;
      const finalValue = Array.isArray(value) ? value.map(v => `__EXCLUDE__${v}`) : `__EXCLUDE__${value}`;
      setDrillStack((prev) => [
        ...prev,
        {
          fromDimension: column,
          toDimension: prev.length > 0 ? prev[prev.length - 1].toDimension : column,
          filterColumn: column,
          filterValue: finalValue as any,
          label: `${column} ≠ ${labelValue}`,
        },
      ]);
    },
    [],
  );

  return {
    drillStack,
    isDrilled,
    currentDimension,
    drillFilters,
    drillDown,
    drillUp,
    drillToLevel,
    resetDrill,
    filterByValue,
    excludeValue,
  };
}
