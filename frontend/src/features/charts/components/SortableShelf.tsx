import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import ShelfPill from './ShelfPill';

interface ShelfItem {
  name: string;
  alias: string;
  [key: string]: any;
}

interface SortableShelfProps {
  label: string;
  items: ShelfItem[];
  onReorder: (items: ShelfItem[]) => void;
  onAliasChange: (index: number, newAlias: string) => void;
  onRemove: (name: string) => void;
  color: 'blue' | 'green' | 'purple';
  emptyText?: string;
}

const SortableShelf: React.FC<SortableShelfProps> = ({
  label,
  items,
  onReorder,
  onAliasChange,
  onRemove,
  color,
  emptyText = 'Drop fields here',
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.name === active.id);
      const newIndex = items.findIndex((i) => i.name === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="w-16 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <div className="flex-1 min-h-[40px] bg-slate-50/80 dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 rounded-md flex flex-wrap items-center gap-2 p-1.5 shadow-inner transition-all">
        {items.length === 0 ? (
          <span className="text-[11px] font-medium text-slate-400 italic px-2">
            {emptyText}
          </span>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.name)}
              strategy={horizontalListSortingStrategy}
            >
              {items.map((item, idx) => (
                <ShelfPill
                  key={item.name}
                  id={item.name}
                  alias={item.alias}
                  color={color}
                  onAliasChange={(val) => onAliasChange(idx, val)}
                  onRemove={() => onRemove(item.name)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default SortableShelf;
