import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, BarChart3, Terminal, Database, Command } from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  type: 'dashboard' | 'chart' | 'dataset' | 'page';
  path: string;
  icon: React.ReactNode;
}

const searchItems: SearchItem[] = [
  { id: '1', title: 'Executive Overview', type: 'dashboard', path: '/dashboards/1', icon: <LayoutDashboard size={16} /> },
  { id: '2', title: 'Sales Pipeline', type: 'dashboard', path: '/dashboards/2', icon: <LayoutDashboard size={16} /> },
  { id: '3', title: 'Marketing Analytics', type: 'dashboard', path: '/dashboards/3', icon: <LayoutDashboard size={16} /> },
  { id: '4', title: 'Customer Success', type: 'dashboard', path: '/dashboards/4', icon: <LayoutDashboard size={16} /> },
  { id: '5', title: 'Chart Builder', type: 'page', path: '/charts/builder', icon: <BarChart3 size={16} /> },
  { id: '6', title: 'SQL Lab', type: 'page', path: '/sqllab', icon: <Terminal size={16} /> },
  { id: '7', title: 'Datasources', type: 'page', path: '/data/datasources', icon: <Database size={16} /> },
  { id: '8', title: 'Datasets', type: 'page', path: '/data/datasets', icon: <Database size={16} /> },
];

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const filteredItems = searchItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: SearchItem) => {
    navigate(item.path);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search dashboards, charts, pages..."
            className="flex-1 py-4 text-sm outline-none bg-transparent placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No results found for "{query}"
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="text-slate-400">{item.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{item.title}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">
                  {item.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><Command size={10} />K to toggle</span>
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
