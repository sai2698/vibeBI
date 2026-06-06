import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge,
  Handle,
  Position,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  NodeChange,
  EdgeChange,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, ArrowRightLeft, Check, Save, Play, X, Plus, Settings2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { useLOBStore } from '../../store/useLOBStore';
import toast from 'react-hot-toast';

// --- Custom Edge ---
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={() => data?.onDelete(id)}
            className="w-5 h-5 bg-white border border-slate-300 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all shadow-sm"
          >
            <X size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// --- Custom Nodes (Simplified for Canvas) ---

const SourceNode = ({ data, selected }: { data: any, selected: boolean }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${selected ? 'border-brand shadow-brand/20' : 'border-slate-200'} w-48 transition-all`}>
      <div className="bg-blue-50 px-3 py-2 rounded-t-xl border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-500" />
          <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider">Source</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); data.onDeleteNode(data.id); }} className="text-blue-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-3">
        <div className="text-xs font-medium text-slate-800 truncate">
          {data.nodeNames?.[data.id] || 'Select Dataset...'}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 bg-blue-500 border-2 border-white shadow-sm cursor-crosshair" />
    </div>
  );
};

const JoinNode = ({ data, selected }: { data: any, selected: boolean }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${selected ? 'border-brand shadow-brand/20' : 'border-slate-200'} w-48 transition-all`}>
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 bg-amber-500 border-2 border-white shadow-sm cursor-crosshair" id="left" />
      <div className="bg-amber-50 px-3 py-2 rounded-t-xl border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={14} className="text-amber-600" />
          <span className="font-bold text-[10px] text-amber-800 uppercase tracking-wider">Join</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); data.onDeleteNode(data.id); }} className="text-amber-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-3">
        <div className="text-xs font-medium text-slate-800 truncate">
          {data.join_type || 'INNER JOIN'}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 bg-amber-500 border-2 border-white shadow-sm cursor-crosshair" />
    </div>
  );
};

const OutputNode = ({ selected }: { selected: boolean }) => (
  <div className={`bg-white rounded-xl shadow-lg border-2 ${selected ? 'border-brand shadow-brand/20' : 'border-emerald-500'} w-48 transition-all`}>
    <Handle type="target" position={Position.Left} className="!w-4 !h-4 bg-emerald-500 border-2 border-white shadow-sm cursor-crosshair" />
    <div className="bg-emerald-50 px-3 py-2 rounded-t-lg border-b border-emerald-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Check size={14} className="text-emerald-600" />
        <span className="font-bold text-[10px] text-emerald-800 uppercase tracking-wider">Final Output</span>
      </div>
    </div>
    <div className="p-3">
      <div className="text-xs font-medium text-slate-500">
        Compiled Dataset
      </div>
    </div>
  </div>
);

const nodeTypes = {
  sourceNode: SourceNode,
  joinNode: JoinNode,
  outputNode: OutputNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes: Node[] = [
  { id: '1', type: 'sourceNode', position: { x: 100, y: 100 }, data: { id: '1' } },
  { id: '2', type: 'outputNode', position: { x: 500, y: 100 }, data: { id: '2' } },
];
const initialEdges: Edge[] = [];

// --- Main Component ---

const DataflowBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const queryClient = useQueryClient();
  
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  
  const [datasetName, setDatasetName] = useState('New Dataflow');
  const [datasourceId, setDatasourceId] = useState<number | ''>('');
  
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  // Fetch datasets for SourceNode
  const { data: datasets } = useQuery({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => {
      const res = await api.get('/api/datasets', { params: { lob_id: activeLOB?.id } });
      return res.data;
    }
  });

  // Fetch datasources for the execution engine context
  const { data: datasources } = useQuery({
    queryKey: ['datasources'],
    queryFn: async () => {
      const res = await api.get('/api/datasources');
      return res.data;
    }
  });

  // Fetch dataset if in edit mode
  useQuery({
    queryKey: ['dataset', editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await api.get(`/api/datasets/${editId}`);
      const ds = res.data;
      setDatasetName(ds.name);
      setDatasourceId(ds.datasource_id);
      if (ds.flow_config) {
        setNodes(ds.flow_config.nodes || initialNodes);
        setEdges(ds.flow_config.edges || initialEdges);
      }
      return ds;
    },
    enabled: !!editId
  });

  // Handle node data changes
  const onNodeDataChange = useCallback((id: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      })
    );
  }, []);

  const onDeleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, []);

  const onDeleteEdge = useCallback((id: string) => {
    setEdges(eds => eds.filter(e => e.id !== id));
  }, []);

  // Inject dynamic data/handlers into nodes
  const nodesWithInjectedData = useMemo(() => {
    const getColumnsForNode = (nodeId: string, visited = new Set<string>()): any[] => {
      if (visited.has(nodeId)) return [];
      visited.add(nodeId);
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return [];
      
      if (node.type === 'sourceNode' && node.data.dataset_id) {
        const ds = datasets?.find((d: any) => d.id === node.data.dataset_id);
        return ds?.columns || [];
      }
      
      const incomingEdges = edges.filter(e => e.target === nodeId);
      const cols: any[] = [];
      incomingEdges.forEach(e => {
         cols.push(...getColumnsForNode(e.source, visited));
      });
      return cols;
    };

    return nodes.map(node => {
      const incomingEdges = edges.filter(e => e.target === node.id);
      const parentNodes = incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);
      const parentColumns: Record<string, any[]> = {};
      const nodeNames: Record<string, string> = {};
      
      parentNodes.forEach(pNode => {
         if (pNode) {
            parentColumns[pNode.id] = getColumnsForNode(pNode.id);
            if (pNode.type === 'sourceNode' && pNode.data.dataset_id) {
               const ds = datasets?.find((d: any) => d.id === pNode.data.dataset_id);
               nodeNames[pNode.id] = ds?.name || `Dataset ${pNode.id}`;
            } else {
               nodeNames[pNode.id] = `Node ${pNode.id}`;
            }
         }
      });

      if (node.type === 'sourceNode' && node.data.dataset_id) {
         const ds = datasets?.find((d: any) => d.id === node.data.dataset_id);
         nodeNames[node.id] = ds?.name || `Dataset ${node.id}`;
      } else {
         nodeNames[node.id] = `Node ${node.id}`;
      }

      return {
        ...node,
        data: {
          ...node.data,
          onChange: onNodeDataChange,
          onDeleteNode,
          availableDatasets: datasets || [],
          currentDatasourceId: datasourceId,
          parentNodes,
          parentColumns,
          nodeNames
        }
      };
    });
  }, [nodes, edges, datasets, datasourceId, onNodeDataChange, onDeleteNode]);

  const edgesWithInjectedData = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      type: 'custom',
      data: {
        ...edge.data,
        onDelete: onDeleteEdge
      }
    }));
  }, [edges, onDeleteEdge]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection | Edge) => {
    const targetNode = nodes.find(n => n.id === params.target);
    if (targetNode?.type === 'joinNode') {
      const incomingEdges = edges.filter(e => e.target === params.target);
      if (incomingEdges.length >= 2) {
        toast.error('A Join node can only accept 2 input sources. Please use another Join node for additional sources.');
        return;
      }
    }
    setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds));
  }, [nodes, edges]);

  const addNode = (type: string) => {
    const newNode = {
      id: Date.now().toString(),
      type,
      position: { x: 300, y: 200 },
      data: { id: Date.now().toString() }
    };
    setNodes(nds => [...nds, newNode]);
  };

  const handlePreview = async () => {
    if (!datasourceId) {
      toast.error('Please select an Execution Engine (Datasource) to preview the flow.');
      return;
    }
    
    setIsPreviewing(true);
    try {
      const payload = {
        name: datasetName,
        datasource_id: datasourceId,
        dataset_type: 'flow',
        flow_config: { nodes, edges },
        lob_id: activeLOB?.id
      };
      const res = await api.post('/api/datasets/preview-flow', payload);
      setPreviewData(res.data);
      toast.success('Preview loaded');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Preview failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Ensure backend compiles the SQL successfully before saving
      const payload = {
        name: datasetName,
        datasource_id: datasourceId,
        dataset_type: 'flow',
        flow_config: { nodes, edges },
        lob_id: activeLOB?.id
      };
      
      // Implicit validation via preview endpoint
      await api.post('/api/datasets/preview-flow', payload);

      if (editId) {
        const res = await api.patch(`/api/datasets/${editId}`, payload);
        return res.data;
      } else {
        const res = await api.post('/api/datasets/', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editId ? 'Dataflow updated!' : 'Dataflow dataset created!');
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      navigate('/data/datasets');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save dataflow. Ensure the flow logic is correct.');
    }
  });

  const selectedNode = nodesWithInjectedData.find(n => n.selected) as any;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-50">
      {/* Header */}
      <div className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            className="text-lg font-bold text-slate-900 outline-none hover:bg-slate-50 focus:bg-slate-50 px-2 py-1 rounded"
          />
          <div className="w-px h-6 bg-slate-200"></div>
          <select 
            value={datasourceId}
            onChange={(e) => setDatasourceId(parseInt(e.target.value) || '')}
            className="text-sm border-none bg-slate-50 px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Select Execution Engine...</option>
            {datasources?.map((ds: any) => (
              <option key={ds.id} value={ds.id}>{ds.name} ({ds.engine})</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} disabled={isPreviewing} className="px-4 py-2 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">
            {isPreviewing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"/> : <Play size={16} />}
            Preview
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="px-4 py-2 flex items-center gap-2 bg-brand hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-brand/20">
            <Save size={16} />
            {editId ? 'Update Dataflow' : 'Save Dataflow'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane - Steps */}
        <div className="w-64 shrink-0 bg-slate-50/50 border-r border-slate-200 flex flex-col z-10 shadow-sm backdrop-blur-sm">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Database size={14} className="text-brand" /> Steps
            </h3>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto">
            <button onClick={() => addNode('sourceNode')} className="w-full p-4 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl text-sm font-bold flex flex-col items-center gap-2 transition-all shadow-sm hover:shadow group">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database size={20} />
              </div>
              Add Data
            </button>
            <button onClick={() => addNode('joinNode')} className="w-full p-4 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-300 rounded-xl text-sm font-bold flex flex-col items-center gap-2 transition-all shadow-sm hover:shadow group">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRightLeft size={20} />
              </div>
              Join Tables
            </button>
          </div>
        </div>

        {/* Center Pane - Canvas */}
        <div className="flex-1 relative bg-slate-100/50">
          <ReactFlow
            nodes={nodesWithInjectedData}
            edges={edgesWithInjectedData}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#cbd5e1" />
            <Controls />
          </ReactFlow>

          {/* Preview Panel Overlay */}
          {previewData && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-96 z-50 animate-in slide-in-from-bottom-10">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Database size={16} className="text-brand"/> Preview Results
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{previewData.row_count} rows returned</p>
                </div>
                <button onClick={() => setPreviewData(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto custom-scrollbar">
                {previewData.compiled_sql && (
                   <div className="mb-4">
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Compiled SQL</div>
                     <pre className="p-3 bg-slate-900 text-slate-300 text-xs font-mono rounded-xl overflow-x-auto border border-slate-800 shadow-inner">
                       {previewData.compiled_sql}
                     </pre>
                   </div>
                )}
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Data Sample</div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {previewData.columns.map((col: string) => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 whitespace-nowrap border-b border-slate-200">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {previewData.data.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          {previewData.columns.map((col: string) => (
                            <td key={col} className="px-4 py-2 text-slate-600 whitespace-nowrap">{row[col]?.toString() || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.data.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No data returned</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane - Step Editor */}
        {selectedNode && (
          <div className="w-80 shrink-0 bg-white border-l border-slate-200 flex flex-col z-10 shadow-sm animate-in slide-in-from-right-4 duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings2 size={14} className="text-slate-500" /> Step Editor
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              
              {/* SOURCE NODE EDITOR */}
              {selectedNode.type === 'sourceNode' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Dataset Selection</label>
                    {!selectedNode.data.currentDatasourceId ? (
                      <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        Please select an Execution Engine first.
                      </div>
                    ) : (
                      <select 
                        className="w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 hover:bg-white transition-colors"
                        value={selectedNode.data.dataset_id || ''}
                        onChange={(e) => onNodeDataChange(selectedNode.id, 'dataset_id', parseInt(e.target.value))}
                      >
                        <option value="">Select a Dataset...</option>
                        {selectedNode.data.availableDatasets?.filter((ds: any) => ds.datasource_id === selectedNode.data.currentDatasourceId).map((ds: any) => (
                          <option key={ds.id} value={ds.id}>{ds.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedNode.data.dataset_id && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">Columns</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                        {selectedNode.data.availableDatasets?.find((ds: any) => ds.id === selectedNode.data.dataset_id)?.columns?.map((col: any, idx: number) => (
                           <div key={idx} className="text-xs text-slate-700 flex items-center gap-2 bg-white p-2 rounded border border-slate-100 shadow-sm">
                             <Database size={12} className="text-blue-400 shrink-0" />
                             <span className="truncate font-medium">{col.friendly_name || col.column_name}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* JOIN NODE EDITOR */}
              {selectedNode.type === 'joinNode' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Join Type</label>
                    <select 
                      className="w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 bg-slate-50 hover:bg-white transition-colors"
                      value={selectedNode.data.join_type || 'INNER JOIN'}
                      onChange={(e) => onNodeDataChange(selectedNode.id, 'join_type', e.target.value)}
                    >
                      <option value="INNER JOIN">Inner Join</option>
                      <option value="LEFT JOIN">Left Join</option>
                      <option value="RIGHT JOIN">Right Join</option>
                      <option value="FULL OUTER JOIN">Full Outer Join</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Join Conditions</label>
                    {selectedNode.data.parentNodes?.length < 2 ? (
                      <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200 text-center italic">
                        Connect exactly 2 source nodes to configure join conditions.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(selectedNode.data.join_conditions || []).map((cond: any, i: number) => {
                          const leftNode = selectedNode.data.parentNodes[0];
                          const rightNode = selectedNode.data.parentNodes[1];
                          const leftName = leftNode ? selectedNode.data.nodeNames[leftNode.id] : 'LEFT';
                          const rightName = rightNode ? selectedNode.data.nodeNames[rightNode.id] : 'RIGHT';
                          
                          return (
                            <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2 relative group">
                              <button 
                                onClick={() => {
                                  const newConditions = selectedNode.data.join_conditions.filter((_: any, idx: number) => idx !== i);
                                  onNodeDataChange(selectedNode.id, 'join_conditions', newConditions);
                                }} 
                                className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                              
                              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{leftName} Column</div>
                              <select 
                                className="w-full text-xs p-2 border border-slate-200 rounded outline-none" 
                                value={cond.left_col} 
                                onChange={e => {
                                  const newConditions = [...selectedNode.data.join_conditions];
                                  newConditions[i] = { ...newConditions[i], left_col: e.target.value };
                                  onNodeDataChange(selectedNode.id, 'join_conditions', newConditions);
                                }}
                              >
                                <option value="" disabled>Select column...</option>
                                {leftNode && selectedNode.data.parentColumns[leftNode.id]?.map((col: any) => (
                                  <option key={col.column_name} value={col.column_name}>{col.column_name}</option>
                                ))}
                              </select>

                              <div className="text-center font-bold text-slate-300">=</div>

                              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{rightName} Column</div>
                              <select 
                                className="w-full text-xs p-2 border border-slate-200 rounded outline-none" 
                                value={cond.right_col} 
                                onChange={e => {
                                  const newConditions = [...selectedNode.data.join_conditions];
                                  newConditions[i] = { ...newConditions[i], right_col: e.target.value };
                                  onNodeDataChange(selectedNode.id, 'join_conditions', newConditions);
                                }}
                              >
                                <option value="" disabled>Select column...</option>
                                {rightNode && selectedNode.data.parentColumns[rightNode.id]?.map((col: any) => (
                                  <option key={col.column_name} value={col.column_name}>{col.column_name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                        
                        <button 
                          onClick={() => {
                            const leftNode = selectedNode.data.parentNodes[0];
                            const rightNode = selectedNode.data.parentNodes[1];
                            const conditions = selectedNode.data.join_conditions || [];
                            onNodeDataChange(selectedNode.id, 'join_conditions', [
                              ...conditions, 
                              { 
                                left_node: leftNode ? `node_${leftNode.id.replace(/-/g, '_')}` : '', 
                                left_col: '', 
                                op: '=', 
                                right_node: rightNode ? `node_${rightNode.id.replace(/-/g, '_')}` : '', 
                                right_col: '' 
                              }
                            ]);
                          }} 
                          className="w-full py-2 bg-white border border-dashed border-slate-300 hover:border-amber-400 text-slate-500 hover:text-amber-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={14} /> Add Condition
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* OUTPUT NODE EDITOR */}
              {selectedNode.type === 'outputNode' && (
                <div className="text-center text-slate-500 py-8">
                  <Check size={32} className="mx-auto mb-4 text-emerald-200" />
                  <p className="text-sm">This is the final output of your dataflow.</p>
                  <p className="text-xs mt-2 text-slate-400">Preview the dataflow to see the final schema.</p>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DataflowBuilder;
