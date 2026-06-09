import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  useTransition,
} from "react";
import { List } from "react-window";
import { Search, Check, ChevronDown, X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
}

const ITEM_HEIGHT = 36;
const LIST_HEIGHT = 260;
const MAX_FILTER_CACHE = 50;

// ---------------------------------------------------------------------------
// Selection store with PER-ITEM subscriptions.
//
// The previous version used a shared useSyncExternalStore snapshot — when any
// item was toggled, notify() fired ALL visible row subscribers, causing every
// visible row to re-render. React.memo does NOT block useSyncExternalStore
// re-renders, so all 8–10 visible rows re-rendered on every single click.
//
// This version maintains a Map<item, Set<listener>> so toggling item X fires
// only X's listeners → only row X re-renders. O(1) per toggle.
// ---------------------------------------------------------------------------
function createSelectionStore(initial: string[]) {
  const selected = new Set<string>(initial);

  // Per-item subscribers: item -> set of callbacks
  const itemListeners = new Map<string, Set<() => void>>();
  // Global subscribers (used for button label / count updates)
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

  function notifyItem(item: string) {
    itemListeners.get(item)?.forEach((cb) => cb());
  }

  function notifyGlobal() {
    globalListeners.forEach((cb) => cb());
  }

  function isSelected(item: string) {
    return selected.has(item);
  }

  function toggle(item: string) {
    if (selected.has(item)) selected.delete(item);
    else selected.add(item);
    notifyItem(item);    // only that row
    notifyGlobal();      // button label
  }

  function clear() {
    const prev = Array.from(selected);
    selected.clear();
    prev.forEach(notifyItem); // only previously-selected rows
    notifyGlobal();
  }

  function replace(values: string[]) {
    const prev = Array.from(selected);
    selected.clear();
    for (const v of values) selected.add(v);
    // notify rows whose state actually changed
    const next = new Set(values);
    const changed = new Set([...prev, ...values].filter(
      (v) => prev.includes(v) !== next.has(v)
    ));
    changed.forEach(notifyItem);
    notifyGlobal();
  }

  function getSize() { return selected.size; }
  function toArray() { return Array.from(selected); }
  function getFirst() { return selected.values().next().value ?? ""; }

  return {
    subscribeToItem,
    subscribeGlobal,
    isSelected,
    toggle,
    clear,
    replace,
    getSize,
    toArray,
    getFirst,
  };
}

type SelectionStore = ReturnType<typeof createSelectionStore>;

// ---------------------------------------------------------------------------
// useItemSelected — subscribes only to a single item's changes.
// When item X is toggled, only rows rendering item X re-render.
// ---------------------------------------------------------------------------
function useItemSelected(store: SelectionStore, item: string): boolean {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return store.subscribeToItem(item, () => forceUpdate((n) => n + 1));
  }, [store, item]);

  return store.isSelected(item);
}

// ---------------------------------------------------------------------------
// OptionRow — completely outside MultiSelect to prevent new component type
// on every parent render. Uses per-item subscription for surgical updates.
// ---------------------------------------------------------------------------
type OptionRowProps = {
  index: number;
  style: React.CSSProperties;
  items: string[];
  store: SelectionStore;
  onToggle: (value: string) => void;
};

const OptionRow = React.memo(function OptionRow({
  index,
  style,
  items,
  store,
  onToggle,
}: OptionRowProps) {
  const option = items[index];
  // Only re-renders when THIS item's selection state changes
  const selected = useItemSelected(store, option);

  return (
    <div
      style={style}
      onClick={() => onToggle(option)}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-xs font-semibold transition-colors ${
        selected
          ? "bg-brand/10 text-brand"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          selected
            ? "bg-brand border-brand text-white"
            : "bg-white border-slate-200"
        }`}
      >
        {selected && <Check size={10} strokeWidth={4} />}
      </div>
      <span className="truncate">{option}</span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues = [],
  onChange,
  placeholder = "Select...",
  isLoading = false,
}) => {
  // -------------------------------------------------------------------------
  // Open/close: bypass React state entirely.
  // setIsOpen causes a full parent re-render which flows into List.
  // With 15k rowCount, List re-evaluates its virtual window calculation.
  // Instead: toggle CSS classes directly on the DOM node — zero React work,
  // zero re-renders, identical timing for 100 items and 15k items.
  // -------------------------------------------------------------------------
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpenRef = useRef(false);

  const openDropdown = useCallback(() => {
    isOpenRef.current = true;
    const el = dropdownRef.current;
    if (!el) return;
    el.classList.remove("opacity-0", "-translate-y-1", "pointer-events-none");
    el.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");
    el.removeAttribute("aria-hidden");
    el.removeAttribute("inert");
    chevronRef.current?.classList.add("rotate-180");
    // Focus search input
    requestAnimationFrame(() => {
      el.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
    });
  }, []);

  const closeDropdown = useCallback(() => {
    isOpenRef.current = false;
    const el = dropdownRef.current;
    if (!el) return;

    if (document.activeElement && el.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
      triggerRef.current?.focus();
    }

    el.classList.remove("opacity-100", "translate-y-0", "pointer-events-auto");
    el.classList.add("opacity-0", "-translate-y-1", "pointer-events-none");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("inert", "");
    chevronRef.current?.classList.remove("rotate-180");
  }, []);

  const toggleOpen = useCallback(() => {
    if (isOpenRef.current) closeDropdown();
    else openDropdown();
  }, [openDropdown, closeDropdown]);

  // Outside click — also pure DOM, no setState
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (isOpenRef.current && !containerRef.current?.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeDropdown]);

  // -------------------------------------------------------------------------
  // Selection store — created once, stable across all renders
  // -------------------------------------------------------------------------
  const storeRef = useRef<SelectionStore | null>(null);
  if (!storeRef.current) storeRef.current = createSelectionStore(selectedValues);
  const store = storeRef.current;

  // Button label state — driven by global store subscription (not React state
  // from the open/close path), so label updates don't affect List at all.
  const lastEmittedRef = useRef<string[] | null>(null);
  const latestOnChangeRef = useRef(onChange);
  useEffect(() => { latestOnChangeRef.current = onChange; }, [onChange]);

  // These are the ONLY React state variables in the component.
  // They update only on selection change, not on open/close.
  const [selectedCount, setSelectedCount] = useState(selectedValues.length);
  const [singleLabel, setSingleLabel] = useState(
    selectedValues.length === 1 ? selectedValues[0] : ""
  );

  // Subscribe to global store changes to keep button label in sync
  useEffect(() => {
    return store.subscribeGlobal(() => {
      const count = store.getSize();
      setSelectedCount(count);
      setSingleLabel(count === 1 ? store.getFirst() : "");
    });
  }, [store]);

  // Sync store when parent passes new controlled values
  useEffect(() => {
    if (selectedValues === lastEmittedRef.current) return;
    store.replace(selectedValues);
    // subscribeGlobal above will update count/label
  }, [selectedValues, store]);

  // -------------------------------------------------------------------------
  // Pre-lowercased options cache — computed once per options reference change.
  // Previously, .toLowerCase() was called 15k times per search keystroke.
  // -------------------------------------------------------------------------
  const lowercasedRef = useRef<string[]>([]);
  const prevOptionsRef = useRef<string[]>(options);
  if (prevOptionsRef.current !== options) {
    prevOptionsRef.current = options;
    lowercasedRef.current = options.map((o) => o.toLowerCase());
  }
  // Initialize on first render
  if (lowercasedRef.current.length === 0 && options.length > 0) {
    lowercasedRef.current = options.map((o) => o.toLowerCase());
  }

  // -------------------------------------------------------------------------
  // Search — useTransition defers filter work past the keystroke paint.
  // -------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [isPending, startSearchTransition] = useTransition();
  const [committedSearch, setCommittedSearch] = useState("");

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
      const first = filterCacheRef.current.keys().next().value;
      filterCacheRef.current.delete(first);
    }
    return result;
  }, [options, committedSearch]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    startSearchTransition(() => {
      setCommittedSearch(value.trim().toLowerCase());
    });
  }, []);

  // -------------------------------------------------------------------------
  // Toggle — store update + deferred onChange emit
  // -------------------------------------------------------------------------
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

  useEffect(() => () => {
    if (emitFrameRef.current !== null) cancelAnimationFrame(emitFrameRef.current);
  }, []);

  const toggleOption = useCallback(
    (option: string) => {
      store.toggle(option);
      scheduleEmit();
      // selectedCount/singleLabel update via subscribeGlobal above
    },
    [store, scheduleEmit]
  );

  const clearAll = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (store.getSize() === 0) return;
      store.clear();
      lastEmittedRef.current = [];
      startTransition(() => latestOnChangeRef.current([]));
    },
    [store]
  );

  const buttonLabel = useMemo(() => {
    if (selectedCount === 0) return placeholder;
    if (selectedCount === 1) return singleLabel;
    return `${selectedCount} selected`;
  }, [selectedCount, singleLabel, placeholder]);

  // rowProps: only changes when the visible item list changes (search result).
  // store is stable (ref). toggleOption is stable (useCallback).
  // Open/close no longer causes rowProps to change at all.
  const rowProps = useMemo(
    () => ({ items: filteredOptions, store, onToggle: toggleOption }),
    [filteredOptions, store, toggleOption]
  );

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger button — selectedCount state updates cause re-render here,
          but that only happens on selection change, never on open/close */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium hover:border-brand/40 transition-colors min-w-[160px] shadow-sm active:scale-[0.98]"
      >
        <span className="truncate max-w-[120px] text-slate-700">{buttonLabel}</span>

        <div className="flex items-center gap-1">
          {selectedCount > 0 && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clearAll}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown
            ref={chevronRef}
            size={14}
            className="text-slate-400 transition-transform"
          />
        </div>
      </button>

      {/* Dropdown: always mounted, visibility toggled via DOM classList directly.
          No React state involved in open/close = zero re-renders = zero lag. */}
      <div
        ref={dropdownRef}
        aria-hidden="true"
        inert={true}
        className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden transition-[opacity,transform] duration-150 ease-out opacity-0 -translate-y-1 pointer-events-none"
      >
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search..."
              className={`w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-colors ${
                isPending ? "opacity-60" : ""
              }`}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-xs italic">Loading options...</div>
        ) : filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs italic">No results found</div>
        ) : (
          <List
            rowComponent={OptionRow}
            rowCount={filteredOptions.length}
            rowHeight={ITEM_HEIGHT}
            rowProps={rowProps}
            overscanCount={3}
            style={{ height: LIST_HEIGHT, width: "100%" }}
          />
        )}

        {selectedCount > 0 && (
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 px-2">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-bold text-brand hover:underline px-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;