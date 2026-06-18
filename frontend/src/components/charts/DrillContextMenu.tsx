import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownRight,
  ArrowUpLeft,
  Filter,
  FilterX,
  Table,
  RotateCcw,
  ChevronRight,
  Layers,
  Search,
  X,
} from 'lucide-react';

import { displayCategoryValue } from '../../utils/chartUtils';

export interface DrillMenuClickInfo {
  /** The category value that was clicked (e.g. "North") or array of values */
  categoryValue: string | string[];
  /** The series name (e.g. "Sales") */
  seriesName: string;
  /** The data value */
  dataValue: number | string;
  /** The dimension column name this category belongs to */
  dimensionName: string;
}

interface DrillContextMenuProps {
  /** Position of the menu (viewport coords) */
  x: number;
  y: number;
  /** Info about the clicked chart element */
  clickInfo: DrillMenuClickInfo;
  /** Available columns that can be drilled into */
  availableColumns: string[];
  /** Currently active dimension */
  currentDimension: string;
  /** Whether there is drill history to go back */
  canDrillUp: boolean;
  /** Callbacks */
  onDrillDown: (targetColumn: string) => void;
  onDrillUp: () => void;
  onFilterByValue: () => void;
  onExcludeValue: () => void;
  onSelectMultipleValues?: () => void;
  onViewAsTable?: () => void;
  onResetDrill?: () => void;
  onClose: () => void;
}

const DrillContextMenu: React.FC<DrillContextMenuProps> = ({
  x,
  y,
  clickInfo,
  availableColumns,
  currentDimension,
  canDrillUp,
  onDrillDown,
  onDrillUp,
  onFilterByValue,
  onExcludeValue,
  onSelectMultipleValues,
  onViewAsTable,
  onResetDrill,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isHoveringSubRef = useRef(false);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });
  const [showDrillSub, setShowDrillSub] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmenuLeft, setIsSubmenuLeft] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleMouseEnterSub = () => {
    isHoveringSubRef.current = true;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowDrillSub(true);
  };

  const handleMouseLeaveSub = () => {
    isHoveringSubRef.current = false;
    hoverTimeoutRef.current = setTimeout(() => {
      const isSearchFocused = document.activeElement === searchInputRef.current;
      if (!isHoveringSubRef.current && !isSearchFocused) {
        setShowDrillSub(false);
      }
    }, 300); // 300ms forgiving delay to cross the gap
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      const isSearchFocused = document.activeElement === searchInputRef.current;
      if (!isHoveringSubRef.current && !isSearchFocused) {
        setShowDrillSub(false);
      }
    }, 100);
  };

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let ax = x;
      let ay = y;

      if (x + rect.width > vw - 12) ax = vw - rect.width - 12;
      if (y + rect.height > vh - 12) ay = vh - rect.height - 12;
      if (ax < 12) ax = 12;
      if (ay < 12) ay = 12;

      setAdjustedPos({ x: ax, y: ay });
      
      // Determine if submenu should open to the left (if not enough space on right)
      // Main menu ~220px + Submenu ~180px = ~400px
      if (ax + 420 > vw) {
        setIsSubmenuLeft(true);
      } else {
        setIsSubmenuLeft(false);
      }
    }

    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));
  }, [x, y]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Filter out current dimension from drill targets
  const drillTargets = availableColumns.filter(
    (col) => col !== currentDimension && col !== clickInfo.dimensionName,
  );

  const filteredDrillTargets = drillTargets.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const menuContent = (
    <div
      ref={menuRef}
      className={`drill-context-menu ${isVisible ? 'drill-context-menu--visible' : ''}`}
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 99999,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="drill-menu-header">
        <span className="drill-menu-header-label">
          {Array.isArray(clickInfo.categoryValue) 
            ? `${clickInfo.categoryValue.length} items selected` 
            : displayCategoryValue(clickInfo.categoryValue)}
        </span>
        <span className="drill-menu-header-sub">
          {clickInfo.seriesName}: {typeof clickInfo.dataValue === 'number' ? clickInfo.dataValue.toLocaleString() : clickInfo.dataValue}
        </span>
      </div>

      <div className="drill-menu-divider" />

      {/* Drill Down */}
      {drillTargets.length > 0 && (
        <div
          className="drill-menu-item drill-menu-item--has-sub"
          onMouseEnter={handleMouseEnterSub}
          onMouseLeave={handleMouseLeaveSub}
        >
          <div className="drill-menu-item-icon drill-menu-item-icon--brand">
            <ArrowDownRight size={14} />
          </div>
          <span>Drill Down</span>
          <ChevronRight size={12} className="drill-menu-item-arrow" />

          {/* Sub-menu */}
          {showDrillSub && (
            <div className={`drill-submenu ${isSubmenuLeft ? 'drill-submenu--left' : ''}`}>
              <div className="drill-submenu-label">
                <Layers size={10} />
                Select dimension to drill into
              </div>

              {/* Search Box */}
              <div className="drill-submenu-search-container" onClick={(e) => e.stopPropagation()}>
                <Search size={12} className="drill-submenu-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search dimensions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={handleSearchBlur}
                  className="drill-submenu-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="drill-submenu-search-clear"
                    type="button"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {filteredDrillTargets.length === 0 ? (
                <div className="drill-submenu-empty">No dimensions found</div>
              ) : (
                filteredDrillTargets.map((col) => (
                  <button
                    key={col}
                    className="drill-submenu-item"
                    onClick={() => {
                      onDrillDown(col);
                      onClose();
                    }}
                  >
                    <span className="drill-submenu-item-dot" />
                    {col}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {drillTargets.length === 0 && (
        <div className="drill-menu-item drill-menu-item--disabled">
          <div className="drill-menu-item-icon">
            <ArrowDownRight size={14} />
          </div>
          <span>No more dimensions to drill</span>
        </div>
      )}

      {/* Drill Up */}
      {canDrillUp && (
        <button
          className="drill-menu-item"
          onClick={() => {
            onDrillUp();
            onClose();
          }}
        >
          <div className="drill-menu-item-icon drill-menu-item-icon--amber">
            <ArrowUpLeft size={14} />
          </div>
          <span>Drill Up</span>
        </button>
      )}

      <div className="drill-menu-divider" />

      {/* Filter by value */}
      <button
        className="drill-menu-item"
        onClick={() => {
          onFilterByValue();
          onClose();
        }}
      >
        <div className="drill-menu-item-icon drill-menu-item-icon--emerald">
          <Filter size={14} />
        </div>
        <span>
          Filter by <strong>
            {Array.isArray(clickInfo.categoryValue) 
              ? `${clickInfo.categoryValue.length} items` 
              : clickInfo.categoryValue}
          </strong>
        </span>
      </button>

      {/* Exclude value */}
      <button
        className="drill-menu-item"
        onClick={() => {
          onExcludeValue();
          onClose();
        }}
      >
        <div className="drill-menu-item-icon drill-menu-item-icon--red">
          <FilterX size={14} />
        </div>
        <span>
          Exclude <strong>
            {Array.isArray(clickInfo.categoryValue) 
              ? `${clickInfo.categoryValue.length} items` 
              : clickInfo.categoryValue}
          </strong>
        </span>
      </button>

      {/* View as Table */}
      {onViewAsTable && (
        <>
          <div className="drill-menu-divider" />
          <button
            className="drill-menu-item"
            onClick={() => {
              onViewAsTable();
              onClose();
            }}
          >
            <div className="drill-menu-item-icon">
              <Table size={14} />
            </div>
            <span>View as Table</span>
          </button>
        </>
      )}

      {/* Select Multiple Values */}
      {!Array.isArray(clickInfo.categoryValue) && onSelectMultipleValues && (
        <>
          <button
            className="drill-menu-item"
            onClick={() => {
              onSelectMultipleValues();
              onClose();
            }}
          >
            <div className="drill-menu-item-icon drill-menu-item-icon--brand">
              <Layers size={14} />
            </div>
            <span>Select Multiple Values (Lasso)</span>
          </button>
        </>
      )}

      {/* Reset Drill */}
      {canDrillUp && onResetDrill && (
        <button
          className="drill-menu-item"
          onClick={() => {
            onResetDrill();
            onClose();
          }}
        >
          <div className="drill-menu-item-icon">
            <RotateCcw size={14} />
          </div>
          <span>Reset All Drills</span>
        </button>
      )}
    </div>
  );

  return createPortal(menuContent, document.body);
};

export default DrillContextMenu;
