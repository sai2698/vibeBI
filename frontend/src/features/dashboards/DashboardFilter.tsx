import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  useTransition,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Check, Calendar, Type, ChevronDown } from 'lucide-react';
import { List } from 'react-window';
import api from '../../api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FilterDef {
  id: string;
  label: string;
  column: string;
  type: 'select' | 'text' | 'date_range';
  source?: 'static' | 'dynamic';
  dataset_id?: number;
  value_column?: string;
  options?: string[];
  default_value?: string;
  is_required?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-item selection store (identical pattern to MultiSelect)
// Toggling item X fires only X's listeners → only row X re-renders.
// ─────────────────────────────────────────────────────────────────────────────

function createSelectionStore(initial: string[]) {
  const selected = new Set<string>(initial);
  const itemListeners = new Map<string, Set<() => void>>();
  const globalListeners = new Set<() => void>();

  function subscribeToItem(item: string, cb: () => void) {
    let cbs = itemListeners.get(item);
    if (!cbs) { cbs = new Set(); itemListeners.set(item, cbs); }
    cbs.add(cb);
    return () => { cbs!.delete(cb); };
  }

  function subscribeGlobal(cb: () => void) {
    globalListeners.add(cb);
    return () => { globalListeners.delete(cb); };
  }

  function notifyItem(item: string) { itemListeners.get(item)?.forEach(cb => cb()); }
  function notifyGlobal() { globalListeners.forEach(cb => cb()); }

  function isSelected(item: string) { return selected.has(item); }

  function toggle(item: string) {
    if (selected.has(item)) selected.delete(item);
    else selected.add(item);
    notifyItem(item);
    notifyGlobal();
  }

  function clear() {
    const prev = Array.from(selected);
    selected.clear();
    prev.forEach(notifyItem);
    notifyGlobal();
  }

  function replace(values: string[]) {
    const prev = Array.from(selected);
    selected.clear();
    for (const v of values) selected.add(v);
    const next = new Set(values);
    const changed = new Set([...prev, ...values].filter(v => prev.includes(v) !== next.has(v)));
    changed.forEach(notifyItem);
    notifyGlobal();
  }

  function selectAll(all: string[]) {
    all.forEach(v => selected.add(v));
    all.forEach(notifyItem);
    notifyGlobal();
  }

  function getSize() { return selected.size; }
  function toArray() { return Array.from(selected); }

  return { subscribeToItem, subscribeGlobal, isSelected, toggle, clear, replace, selectAll, getSize, toArray };
}

type SelectionStore = ReturnType<typeof createSelectionStore>;

function useItemSelected(store: SelectionStore, item: string): boolean {
  const [, forceUpdate] = useState(0);
  useEffect(() => store.subscribeToItem(item, () => forceUpdate(n => n + 1)), [store, item]);
  return store.isSelected(item);
}

// ─────────────────────────────────────────────────────────────────────────────
// Virtualised option row — mounted outside parent to prevent new component type
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 34;
const LIST_HEIGHT = 192; // max-h-48 equivalent

/** Display user-friendly labels for sentinel values */
const displayFilterValue = (v: string): string => {
  if (v === '__NULL__') return '(No Value)';
  if (v === '__EMPTY__') return '(Empty)';
  return v;
};

type OptionRowProps = {
  index: number;
  style: React.CSSProperties;
  items: string[];
  store: SelectionStore;
  onToggle: (value: string) => void;
};

const OptionRow = React.memo(function OptionRow({ index, style, items, store, onToggle }: OptionRowProps) {
  const option = items[index];
  const selected = useItemSelected(store, option);
  const isSentinel = option === '__NULL__' || option === '__EMPTY__';

  return (
    <div
      style={style}
      onClick={() => onToggle(option)}
      className={`flex items-center gap-2.5 px-2.5 cursor-pointer transition-colors text-xs font-semibold ${
        selected ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
        selected ? 'bg-brand border-brand text-white' : 'bg-white border-slate-200'
      }`}>
        {selected && <Check size={9} strokeWidth={4} />}
      </div>
      <span className={`truncate ${isSentinel ? 'italic text-slate-400' : ''}`}>{displayFilterValue(option)}</span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FilterSelectDropdown — performant multi-select with virtualisation
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FILTER_CACHE = 50;

interface FilterSelectDropdownProps {
  filter: FilterDef;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  dashboardId?: string;
}

export const FilterSelectDropdown: React.FC<FilterSelectDropdownProps> = ({
  filter,
  selectedValues = [],
  onChange,
  dashboardId,
}) => {
  const { data: dynamicOptions, isLoading } = useQuery<string[]>({
    queryKey: ['datasets', filter.dataset_id, 'columns', filter.value_column, 'values', dashboardId],
    queryFn: async () => {
      const url = dashboardId 
        ? `/api/datasets/${filter.dataset_id}/columns/${filter.value_column}/values?dashboard_id=${dashboardId}`
        : `/api/datasets/${filter.dataset_id}/columns/${filter.value_column}/values`;
      const response = await api.get(url);
      return response.data;
    },
    enabled: filter.source === 'dynamic' && !!filter.dataset_id && !!filter.value_column,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
  });

  const options = useMemo(
    () => (filter.source === 'dynamic' ? dynamicOptions || [] : filter.options || []),
    [filter, dynamicOptions]
  );

  // ── Selection store ──────────────────────────────────────────────────────
  const storeRef = useRef<SelectionStore | null>(null);
  if (!storeRef.current) storeRef.current = createSelectionStore(selectedValues);
  const store = storeRef.current;

  const lastEmittedRef = useRef<string[] | null>(null);
  const latestOnChangeRef = useRef(onChange);
  useEffect(() => { latestOnChangeRef.current = onChange; }, [onChange]);

  const [selectedCount, setSelectedCount] = useState(selectedValues.length);
  useEffect(() => store.subscribeGlobal(() => setSelectedCount(store.getSize())), [store]);

  useEffect(() => {
    if (selectedValues === lastEmittedRef.current) return;
    store.replace(selectedValues);
  }, [selectedValues, store]);

  // ── Deferred onChange emit (batched via rAF) ─────────────────────────────
  const emitFrameRef = useRef<number | null>(null);
  const scheduleEmit = useCallback(() => {
    if (emitFrameRef.current !== null) cancelAnimationFrame(emitFrameRef.current);
    emitFrameRef.current = requestAnimationFrame(() => {
      const next = store.toArray();
      lastEmittedRef.current = next;
      startTransition(() => latestOnChangeRef.current(next));
      emitFrameRef.current = null;
    });
  }, [store]);
  useEffect(() => () => { if (emitFrameRef.current !== null) cancelAnimationFrame(emitFrameRef.current); }, []);

  const toggleOption = useCallback((option: string) => {
    store.toggle(option);
    scheduleEmit();
  }, [store, scheduleEmit]);

  // ── Select All ───────────────────────────────────────────────────────────
  const toggleSelectAll = useCallback(() => {
    if (store.getSize() === options.length) {
      store.clear();
      lastEmittedRef.current = [];
      startTransition(() => latestOnChangeRef.current([]));
    } else {
      store.selectAll(options);
      const next = store.toArray();
      lastEmittedRef.current = next;
      startTransition(() => latestOnChangeRef.current(next));
    }
  }, [store, options]);

  const clearAll = useCallback(() => {
    store.clear();
    lastEmittedRef.current = [];
    startTransition(() => latestOnChangeRef.current([]));
  }, [store]);

  // ── Search with useTransition ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [isPending, startSearchTransition] = useTransition();
  const [committedSearch, setCommittedSearch] = useState('');

  const lowercasedRef = useRef<string[]>([]);
  const prevOptionsRef = useRef<string[]>(options);
  if (prevOptionsRef.current !== options) {
    prevOptionsRef.current = options;
    lowercasedRef.current = options.map(o => String(o).toLowerCase());
  }
  if (lowercasedRef.current.length === 0 && options.length > 0) {
    lowercasedRef.current = options.map(o => String(o).toLowerCase());
  }

  const filterCacheRef = useRef<Map<string, string[]>>(new Map());
  useEffect(() => { filterCacheRef.current.clear(); }, [options]);

  const filteredOptions = useMemo(() => {
    if (!committedSearch) return options;
    const cached = filterCacheRef.current.get(committedSearch);
    if (cached) return cached;
    const lowercased = lowercasedRef.current;
    const result: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (lowercased[i].includes(committedSearch)) result.push(options[i]);
    }
    filterCacheRef.current.set(committedSearch, result);
    if (filterCacheRef.current.size > MAX_FILTER_CACHE) {
      filterCacheRef.current.delete(filterCacheRef.current.keys().next().value!);
    }
    return result;
  }, [options, committedSearch]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    startSearchTransition(() => setCommittedSearch(value.trim().toLowerCase()));
  }, []);

  const rowProps = useMemo(
    () => ({ items: filteredOptions, store, onToggle: toggleOption }),
    [filteredOptions, store, toggleOption]
  );

  const allSelected = selectedCount === options.length && options.length > 0;

  return (
    <div className="flex flex-col gap-2 w-64">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search options..."
          className={`w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-all ${isPending ? 'opacity-60' : ''}`}
        />
      </div>

      {/* Select All / Clear */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 pt-0.5 px-1.5">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="text-[10px] text-brand hover:text-brand-dark font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] text-red-500 hover:text-red-600 font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear Selected
          </button>
        )}
      </div>

      {/* Virtualised list */}
      <div className="overflow-hidden rounded-md">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-xs italic">Loading options...</div>
        ) : filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs italic">No options found</div>
        ) : (
          <List
            rowComponent={OptionRow}
            rowCount={filteredOptions.length}
            rowHeight={ITEM_HEIGHT}
            rowProps={rowProps}
            overscanCount={4}
            style={{
              height: Math.min(filteredOptions.length * ITEM_HEIGHT, LIST_HEIGHT),
              width: '100%',
            }}
          />
        )}
      </div>

      {/* Footer */}
      {selectedCount > 0 && (
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span>{selectedCount} of {options.length} Selected</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FilterTextDropdown — unchanged, already lightweight
// ─────────────────────────────────────────────────────────────────────────────

interface FilterTextDropdownProps {
  filter: FilterDef;
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

export const FilterTextDropdown: React.FC<FilterTextDropdownProps> = ({
  filter,
  value = '',
  onChange,
  onClose,
}) => {
  const [localVal, setLocalVal] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(localVal);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-56">
      <input
        autoFocus
        type="text"
        placeholder={`Search ${filter.label}...`}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-all"
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => { setLocalVal(''); onChange(''); onClose(); }}
          className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="submit"
          className="px-2.5 py-1 bg-brand text-white text-[10px] font-bold rounded-md shadow-sm hover:bg-brand-dark transition-all"
        >
          Apply
        </button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FilterDateDropdown — unchanged
// ─────────────────────────────────────────────────────────────────────────────

interface FilterDateDropdownProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

export const FilterDateDropdown: React.FC<FilterDateDropdownProps> = ({
  value = '',
  onChange,
  onClose,
}) => {
  const [localVal, setLocalVal] = useState(value);

  return (
    <div className="flex flex-col gap-2 w-56">
      <input
        autoFocus
        type="date"
        value={localVal}
        onChange={e => { setLocalVal(e.target.value); onChange(e.target.value); }}
        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-all"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setLocalVal(''); onChange(''); onClose(); }}
          className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DashboardFilter — DOM-based open/close (zero React re-renders on toggle)
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardFilterProps {
  filter: FilterDef;
  stagedFilters: Record<string, any>;
  setStagedFilters: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  openFilterId: string | null;
  setOpenFilterId: (id: string | null) => void;
  isMobile: boolean;
  dashboardId?: string;
}

const DashboardFilter: React.FC<DashboardFilterProps> = ({
  filter,
  stagedFilters,
  setStagedFilters,
  openFilterId,
  setOpenFilterId,
  isMobile,
  dashboardId,
}) => {
  // ── DOM refs for open/close (no React state, no re-render on toggle) ─────
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpenRef = useRef(false);

  const openDropdown = useCallback(() => {
    isOpenRef.current = true;
    const el = dropdownRef.current;
    const bd = backdropRef.current;
    if (!el) return;
    el.classList.remove('opacity-0', '-translate-y-1', 'pointer-events-none');
    el.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
    el.removeAttribute('aria-hidden');
    el.removeAttribute('inert');
    if (bd) bd.classList.remove('hidden');
    chevronRef.current?.classList.add('rotate-180');
    requestAnimationFrame(() => {
      el.querySelector<HTMLInputElement>('input')?.focus();
    });
  }, []);

  const closeDropdown = useCallback(() => {
    isOpenRef.current = false;
    const el = dropdownRef.current;
    const bd = backdropRef.current;
    if (!el) return;

    if (document.activeElement && el.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
      triggerRef.current?.focus();
    }

    el.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
    el.classList.add('opacity-0', '-translate-y-1', 'pointer-events-none');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    if (bd) bd.classList.add('hidden');
    chevronRef.current?.classList.remove('rotate-180');
  }, []);

  // Sync with external openFilterId controller
  useEffect(() => {
    if (openFilterId === filter.id) openDropdown();
    else if (isOpenRef.current) closeDropdown();
  }, [openFilterId, filter.id, openDropdown, closeDropdown]);

  const handleTriggerClick = useCallback(() => {
    setOpenFilterId(openFilterId === filter.id ? null : filter.id);
  }, [openFilterId, filter.id, setOpenFilterId]);

  const handleClose = useCallback(() => setOpenFilterId(null), [setOpenFilterId]);

  // ── Derived display values (only re-runs when stagedFilters changes) ──────
  const filterValue = stagedFilters[filter.column];
  const hasValue = Array.isArray(filterValue) ? filterValue.length > 0 : !!filterValue;
  const isDate = filter.type === 'date_range';

  const valueLabel = useMemo(() => {
    if (!hasValue) return '';
    if (Array.isArray(filterValue)) {
      const arr = filterValue;
      if (arr.length === 0) return '';
      if (arr.length === 1) return `: ${displayFilterValue(arr[0])}`;
      if (arr.length <= 3) return `: ${arr.map(displayFilterValue).join(', ')}`;
      return `: ${displayFilterValue(arr[0])}, ${displayFilterValue(arr[1])}, ... (${arr.length} selected)`;
    }
    return `: ${displayFilterValue(filterValue)}`;
  }, [filterValue, hasValue]);

  return (
    <div className="relative">
      {/* Invisible backdrop — DOM only, no React state */}
      <div
        ref={backdropRef}
        className={`fixed inset-0 z-40 hidden ${isMobile ? 'bg-slate-900/30 backdrop-blur-sm' : ''}`}
        onClick={handleClose}
      />

      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold h-9 ${
          hasValue
            ? 'bg-brand/10 border-brand text-brand hover:bg-brand/15'
            : 'bg-white border-slate-200 text-slate-600 hover:border-brand/50 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          {isDate ? (
            <Calendar size={12} className={hasValue ? 'text-brand' : 'text-slate-400'} />
          ) : (
            <Type size={12} className={hasValue ? 'text-brand' : 'text-slate-400'} />
          )}
          <span className="truncate">{filter.label}{valueLabel}</span>
        </div>
        <ChevronDown
          ref={chevronRef}
          size={12}
          className="flex-shrink-0 text-slate-400 transition-transform"
        />
      </button>

      {/* Dropdown — always mounted, toggled via classList (zero re-renders) */}
      <div
        ref={dropdownRef}
        aria-hidden="true"
        inert={true}
        className={`${
          isMobile
            ? 'fixed inset-x-4 top-[20%] mx-auto max-w-[340px] shadow-2xl'
            : 'absolute left-0 mt-1.5 shadow-xl'
        } bg-white border border-slate-150 rounded-xl p-3.5 z-50 flex flex-col gap-2 transition-[opacity,transform] duration-150 ease-out opacity-0 -translate-y-1 pointer-events-none`}
      >
        {filter.type === 'select' ? (
          <FilterSelectDropdown
            filter={filter}
            dashboardId={dashboardId}
            selectedValues={
              Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue] : []
            }
            onChange={val =>
              setStagedFilters(prev => ({ ...prev, [filter.column]: val }))
            }
          />
        ) : filter.type === 'date_range' ? (
          <FilterDateDropdown
            value={filterValue || ''}
            onChange={val => setStagedFilters(prev => ({ ...prev, [filter.column]: val }))}
            onClose={handleClose}
          />
        ) : (
          <FilterTextDropdown
            filter={filter}
            value={filterValue || ''}
            onChange={val => setStagedFilters(prev => ({ ...prev, [filter.column]: val }))}
            onClose={handleClose}
          />
        )}

        {hasValue && (
          <button
            onClick={() => {
              setStagedFilters(prev => {
                const updated = { ...prev };
                delete updated[filter.column];
                return updated;
              });
              handleClose();
            }}
            className="text-[10px] text-center text-red-500 font-bold hover:underline pt-1.5 border-t border-slate-50 mt-1"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardFilter;