import { useState, useCallback, useMemo, useEffect } from 'react';

export interface DrillLevel {
  /** The dimension that was active before drilling */
  fromDimension: string;
  /** The dimension we drilled into */
  toDimension: string;
  /** The filter column (the fromDimension column) */
  filterColumn: string;
  /** The value that was clicked to trigger drill */
  filterValue: string | string[];
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
  drillFilters: Record<string, Array<string | string[]>>;
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
  /** Remove a specific value from a drill level (or the whole level if valueToRemove is empty/last) */
  removeFilterValue: (levelIndex: number, valueToRemove?: string) => void;
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
    const filters: Record<string, Array<string | string[]>> = {};
    drillStack.forEach((level) => {
      if (level.filterValue && level.filterColumn) {
        if (!filters[level.filterColumn]) {
          filters[level.filterColumn] = [];
        }
        filters[level.filterColumn].push(level.filterValue);
      }
    });
    return filters;
  }, [drillStack]);

  const drillDown = useCallback(
    (fromDimension: string, toDimension: string, clickedValue: string | string[]) => {
      const displayLabel = Array.isArray(clickedValue)
        ? `${fromDimension}: ${clickedValue.length} items`
        : `${fromDimension}: ${clickedValue}`;
      setDrillStack((prev) => [
        ...prev,
        {
          fromDimension,
          toDimension,
          filterColumn: fromDimension,
          filterValue: clickedValue,
          label: displayLabel,
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
    (column: string | Record<string, string | string[]>, value?: string | string[]) => {
      setDrillStack((prev) => {
        const newLevels: any[] = [];
        if (typeof column === 'object') {
          Object.entries(column).forEach(([col, val]) => {
            const labelValue = Array.isArray(val) ? `${val.length} items` : val;
            newLevels.push({
              fromDimension: col,
              toDimension: prev.length > 0 ? prev[prev.length - 1].toDimension : col,
              filterColumn: col,
              filterValue: val as any,
              label: `${col} = ${labelValue}`,
            });
          });
        } else {
          const labelValue = Array.isArray(value) ? `${value.length} items` : value;
          newLevels.push({
            fromDimension: column,
            toDimension: prev.length > 0 ? prev[prev.length - 1].toDimension : column,
            filterColumn: column,
            filterValue: value as any,
            label: `${column} = ${labelValue}`,
          });
        }
        return [...prev, ...newLevels];
      });
    },
    [],
  );

  const excludeValue = useCallback(
    (column: string | Record<string, string | string[]>, value?: string | string[]) => {
      setDrillStack((prev) => {
        const newLevels: any[] = [];
        if (typeof column === 'object') {
          Object.entries(column).forEach(([col, val]) => {
            const labelValue = Array.isArray(val) ? `${val.length} items` : val;
            const finalValue = Array.isArray(val) ? val.map(v => `__EXCLUDE__${v}`) : `__EXCLUDE__${val}`;
            newLevels.push({
              fromDimension: col,
              toDimension: prev.length > 0 ? prev[prev.length - 1].toDimension : col,
              filterColumn: col,
              filterValue: finalValue as any,
              label: `${col} ≠ ${labelValue}`,
            });
          });
        } else {
          const labelValue = Array.isArray(value) ? `${value.length} items` : value;
          const finalValue = Array.isArray(value) ? value.map(v => `__EXCLUDE__${v}`) : `__EXCLUDE__${value}`;
          newLevels.push({
            fromDimension: column,
            toDimension: prev.length > 0 ? prev[prev.length - 1].toDimension : column,
            filterColumn: column,
            filterValue: finalValue as any,
            label: `${column} ≠ ${labelValue}`,
          });
        }
        return [...prev, ...newLevels];
      });
    },
    [],
  );

  const removeFilterValue = useCallback((levelIndex: number, valueToRemove?: string) => {
    setDrillStack((prev) => {
      const newStack = [...prev];
      const level = newStack[levelIndex];
      
      if (!level) return prev;
      
      if (valueToRemove && Array.isArray(level.filterValue)) {
        const newValues = level.filterValue.filter(v => v !== valueToRemove);
        if (newValues.length > 0) {
          const isExclude = newValues.every(v => typeof v === 'string' && v.startsWith('__EXCLUDE__'));
          const labelValue = `${newValues.length} items`;
          newStack[levelIndex] = {
            ...level,
            filterValue: newValues as any,
            label: `${level.filterColumn} ${isExclude ? '≠' : '='} ${labelValue}`
          };
          return newStack;
        }
      }
      
      // If no valueToRemove provided or array becomes empty, remove the whole level
      newStack.splice(levelIndex, 1);
      
      // Fix up the dimensions of the remaining levels
      if (levelIndex < newStack.length) {
        let currentDim = levelIndex > 0 ? newStack[levelIndex - 1].toDimension : newStack[0]?.fromDimension;
        for (let i = levelIndex; i < newStack.length; i++) {
          newStack[i].fromDimension = currentDim;
          currentDim = newStack[i].toDimension;
        }
      }
      
      return newStack;
    });
  }, []);

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
    removeFilterValue,
  };
}
