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
  /** Can navigate backward in history */
  canGoBack: boolean;
  /** Can navigate forward in history */
  canGoForward: boolean;
  /** Go back to previous drill state */
  goBack: () => void;
  /** Go forward to next drill state */
  goForward: () => void;
}

export function useDrillDown(restoreAction?: { stack: DrillLevel[]; timestamp: number }): DrillDownState {
  const [state, setState] = useState<{ history: DrillLevel[][]; index: number }>({
    history: [[]],
    index: 0,
  });

  const drillStack = state.history[state.index] || [];

  const setDrillStack = useCallback((updater: React.SetStateAction<DrillLevel[]>) => {
    setState((prevState) => {
      const currentStack = prevState.history[prevState.index];
      const newStack = typeof updater === 'function' ? updater(currentStack) : updater;

      // If nothing changed, return same state
      if (JSON.stringify(newStack) === JSON.stringify(currentStack)) return prevState;

      const nextHistory = prevState.history.slice(0, Math.max(0, prevState.index) + 1);
      nextHistory.push(newStack);
      
      let nextIndex = nextHistory.length - 1;

      // Limit history to 50 items
      if (nextHistory.length > 50) {
         nextHistory.shift();
         nextIndex--;
      }

      return {
        history: nextHistory,
        index: nextIndex
      };
    });
  }, []);

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
    [setDrillStack],
  );

  const drillUp = useCallback(() => {
    setDrillStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, [setDrillStack]);

  const drillToLevel = useCallback((level: number) => {
    setDrillStack((prev) => prev.slice(0, level));
  }, [setDrillStack]);

  const resetDrill = useCallback(() => {
    setDrillStack([]);
  }, [setDrillStack]);

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
    [setDrillStack],
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
    [setDrillStack],
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
  }, [setDrillStack]);

  const goBack = useCallback(() => {
    setState(prev => prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev);
  }, []);

  const goForward = useCallback(() => {
    setState(prev => prev.index < prev.history.length - 1 ? { ...prev, index: prev.index + 1 } : prev);
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
    canGoBack: state.index > 0,
    canGoForward: state.index < state.history.length - 1,
    goBack,
    goForward,
  };
}
