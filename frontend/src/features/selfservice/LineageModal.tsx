import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MarkerType, useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Network } from 'lucide-react';

interface LineageModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: any[];
  joins: any[];
  datamartName: string;
}

const LineageModal: React.FC<LineageModalProps> = ({ isOpen, onClose, datasets, joins, datamartName }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  React.useEffect(() => {
    if (!datasets || datasets.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    const columnCount = Math.ceil(Math.sqrt(datasets.length)) || 1;
    const spacingX = 300;
    const spacingY = 200;

    const nodesList: Node[] = datasets.map((ds, idx) => {
      const col = idx % columnCount;
      const row = Math.floor(idx / columnCount);
      return {
        id: String(ds.id),
        position: { x: col * spacingX + 50, y: row * spacingY + 50 },
        data: { 
          label: (
            <div className="flex flex-col items-center p-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="mb-1">{ds.name}</span>
              {ds.engine && <span className="text-[9px] px-1.5 py-0.5 bg-brand/10 text-brand rounded uppercase">{ds.engine}</span>}
            </div>
          )
        },
        type: 'default',
        style: {
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          minWidth: 150
        }
      };
    });

    const edgesList: Edge[] = joins.map((j, idx) => {
      let friendlyCondition = j.join_condition;
      if (friendlyCondition && datasets) {
        datasets.forEach(ds => {
          const regex = new RegExp(`ds_${ds.id}\\.`, 'g');
          friendlyCondition = friendlyCondition.replace(regex, `${ds.name}.`);
        });
      }

      return {
        id: `e-${j.left_dataset_id}-${j.right_dataset_id}-${idx}`,
        source: String(j.left_dataset_id),
        target: String(j.right_dataset_id),
        label: undefined, // hidden by default
        data: { condition: friendlyCondition },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' },
      style: { strokeWidth: 2, stroke: '#94a3b8' },
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
      };
    });

    setNodes(nodesList);
    setEdges(edgesList);
  }, [datasets, joins]);

  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edge.id) {
          // Toggle label visibility
          return { ...e, label: e.label ? undefined : (e.data?.condition as string) };
        }
        return { ...e, label: undefined }; // Hide others
      })
    );
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-200">
      <div className="shrink-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-lg"><Network size={18} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Dataset Lineage Map</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{datamartName}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 w-full h-full relative">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={onEdgeClick}
          fitView  
          className="bg-slate-50/50 dark:bg-slate-950/50"
        >
          <Background color="#94a3b8" gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default LineageModal;
