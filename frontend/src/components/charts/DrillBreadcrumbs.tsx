import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Layers, ChevronDown, X } from 'lucide-react';
import type { DrillLevel } from './useDrillDown';

interface DrillBreadcrumbsProps {
  drillStack: DrillLevel[];
  originalDimensionLabel?: string;
  onDrillToLevel: (level: number) => void;
  onResetDrill: () => void;
  onRemoveFilterValue?: (levelIndex: number, valueToRemove?: string) => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
}

const DrillBreadcrumbs: React.FC<DrillBreadcrumbsProps> = ({
  drillStack,
  originalDimensionLabel = 'All',
  onDrillToLevel,
  onResetDrill,
  onRemoveFilterValue,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}) => {
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownIdx(null);
      }
    };
    if (openDropdownIdx !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownIdx]);

  if (drillStack.length === 0 && !canGoForward && !canGoBack) return null;

  return (
    <div className="flex items-center gap-2 relative">
      {/* Navigation Buttons */}
      {(canGoBack || canGoForward) && (
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm h-9">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className={`p-1.5 rounded-md transition-colors ${canGoBack ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
            title="Go back"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className={`p-1.5 rounded-md transition-colors ${canGoForward ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
            title="Go forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Pill and Reset */}
      {drillStack.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold h-9 bg-brand/10 border-brand text-brand hover:bg-brand/15">
            <Layers size={12} className="text-brand flex-shrink-0" />

            {/* Root level */}
            <button
              className="text-brand/80 hover:text-brand transition-colors font-semibold"
              onClick={() => onDrillToLevel(0)}
              title="Back to original view"
            >
              {originalDimensionLabel}
            </button>

            {/* Drill levels */}
            {drillStack.map((level, idx) => {
              const isArray = Array.isArray(level.filterValue);
              const isExclude = isArray && level.filterValue.length > 0 && String(level.filterValue[0]).startsWith('__EXCLUDE__');
              
              return (
                <React.Fragment key={idx}>
                  <ChevronRight size={12} className="text-brand/40 flex-shrink-0" />
                  
                  {isArray ? (
                    <div className="relative flex items-center">
                      <div
                        className={`flex items-center transition-colors ${idx === drillStack.length - 1 ? 'text-brand' : 'text-brand/80 hover:text-brand'}`}
                      >
                        <button
                          onClick={() => onDrillToLevel(idx + 1)}
                          className="flex items-center gap-1 hover:underline"
                          title={level.label}
                        >
                          <span className="text-[10px] font-semibold text-brand/60 uppercase tracking-wide">{level.filterColumn}:</span>
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownIdx(openDropdownIdx === idx ? null : idx);
                          }}
                          className="flex items-center ml-1 px-1 rounded hover:bg-brand/10 transition-colors"
                          title="Click to view/edit filter values"
                        >
                          <span>
                            {isExclude ? `≠ ${level.filterValue.length} items` : `${level.filterValue.length} items`}
                          </span>
                          <ChevronDown size={10} className={`ml-0.5 transition-transform ${openDropdownIdx === idx ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      
                      {openDropdownIdx === idx && (
                        <div 
                          ref={dropdownRef}
                          className="absolute top-full mt-2 left-0 z-50 min-w-[200px] bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2"
                        >
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{level.filterColumn}</span>
                            <span className="text-xs text-slate-600 font-medium">
                              {isExclude ? 'Excluding' : 'Including'} {level.filterValue.length} values
                            </span>
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                            {(level.filterValue as string[]).map((val: string, vIdx: number) => {
                              const cleanVal = String(val).replace('__EXCLUDE__', '');
                              return (
                                <div key={vIdx} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 group">
                                  <span className="text-xs text-slate-700 truncate mr-2" title={cleanVal}>
                                    {cleanVal}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveFilterValue?.(idx, val);
                                    }}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove this value"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="p-1 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFilterValue?.(idx);
                                setOpenDropdownIdx(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 font-medium rounded transition-colors text-center"
                            >
                              Remove All Values
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      className={`flex items-center gap-1 transition-colors ${idx === drillStack.length - 1 ? 'text-brand' : 'text-brand/80 hover:text-brand'}`}
                      onClick={() => onDrillToLevel(idx + 1)}
                      title={level.label}
                    >
                      <span className="text-[10px] font-semibold text-brand/60 uppercase tracking-wide">{level.filterColumn}:</span>
                      <span>
                        {String(level.filterValue).replace('__EXCLUDE__', '≠ ')}
                      </span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Reset button */}
          <button
            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
            onClick={onResetDrill}
            title="Reset all drills"
          >
            Clear Drill
          </button>
        </>
      )}
    </div>
  );
};

export default DrillBreadcrumbs;
