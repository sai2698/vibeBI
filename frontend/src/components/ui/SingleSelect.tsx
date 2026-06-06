import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';

export interface SingleSelectOption {
  label: string;
  value: string;
}

interface SingleSelectProps {
  options: SingleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  creatable?: boolean;
}

const SingleSelect: React.FC<SingleSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  buttonClassName = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl",
  creatable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.some(o => o.value.toLowerCase() === search.trim().toLowerCase() || o.label.toLowerCase() === search.trim().toLowerCase());
  const showCreate = creatable && search.trim() !== '' && !exactMatch;

  const selectedOption = options.find(o => o.value === value) || (value ? { label: value, value: value } : null);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand/40 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 ${buttonClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-brand outline-none transition-all dark:text-slate-200"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length === 0 && !showCreate ? (
              <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-xs italic">No results found</div>
            ) : (
              <>
                {filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-xs font-semibold ${
                      value === opt.value
                        ? 'bg-brand/10 text-brand dark:text-brand-light'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && <Check size={12} strokeWidth={3} className="shrink-0" />}
                  </div>
                ))}
                {showCreate && (
                  <div
                    onClick={() => {
                      onChange(search.trim());
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center gap-2 px-3 py-2 mt-1 rounded-md cursor-pointer transition-colors text-xs font-bold text-brand hover:bg-brand/10"
                  >
                    <Plus size={12} className="shrink-0" />
                    <span className="truncate">Create "{search.trim()}"</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleSelect;
