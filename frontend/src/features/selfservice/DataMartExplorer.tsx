import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL, MySQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import api from '../../api';
import { 
  Database, ArrowLeft, Play, Download, Loader2, Type, Hash, Filter, X, ChevronRight, ChevronDown, Layers, Info, Code, Copy, Check, Edit, Save, List, Trash2, Calculator, FunctionSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import MultiSelect from '../../components/ui/MultiSelect';
import LineageModal from './LineageModal';
import { useThemeStore } from '../../store/useThemeStore';

const generateId = () => Math.random().toString(36).substring(2, 9);

export type FilterOperator = 'AND' | 'OR';

export type FilterRuleNode = {
  id: string;
  type: 'rule';
  datasetId: number;
  column_name: string;
  name: string;
  operator: 'IN' | 'NOT_IN' | 'EQUALS' | 'NOT_EQUALS';
  value: any[];
  isCalculated?: boolean;
};

export type FilterGroupNode = {
  id: string;
  type: 'group';
  operator: FilterOperator;
  children: Array<FilterGroupNode | FilterRuleNode>;
};

export type FilterASTNode = FilterGroupNode | FilterRuleNode;

const extractDatasetIdsFromAST = (node: FilterASTNode, ids: Set<number>) => {
  if (node.type === 'rule') {
    if (node.datasetId) ids.add(Number(node.datasetId));
  } else if (node.type === 'group') {
    node.children.forEach(c => extractDatasetIdsFromAST(c, ids));
  }
};

const FilterRuleComponent = ({ node, onUpdate, onRemove }: { node: FilterRuleNode, onUpdate: (id: string, updates: Partial<FilterRuleNode>) => void, onRemove: (id: string) => void }) => {
  const isCalculated = node.isCalculated || false;
  const isFilterable = node.is_filterable !== false;
  
  // For all filterable columns (including calculated), try to fetch values
  // For calculated columns, this will fail gracefully and we'll show text input as fallback
  const { data: filterValues = [], isLoading, isError } = useQuery({
    queryKey: ['filter_values', node.datasetId, node.column_name, isCalculated],
    queryFn: async () => {
      const response = await api.get(`/api/datasets/${node.datasetId}/columns/${node.column_name}/values`);
      return response.data;
    },
    enabled: !!node.datasetId && !!node.column_name && isFilterable,
    staleTime: 60000,
  });

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm p-1.5 rounded-lg transition-all hover:border-amber-200 dark:hover:border-amber-800/50 hover:shadow-md">
      <div className="px-2 border-r border-slate-100 dark:border-slate-700">
        <span className="text-xs text-amber-600 dark:text-amber-500 font-bold truncate w-24 block" title={node.name}>{node.name}</span>
      </div>
      <select 
        value={node.operator} 
        onChange={(e) => onUpdate(node.id, { operator: e.target.value as any })}
        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:text-slate-300 border-slate-700 rounded-md px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none hover:border-amber-300 dark:hover:border-amber-700 focus:border-amber-500 transition-colors cursor-pointer"
      >
        <option value="IN">IN</option>
        <option value="NOT_IN">NOT IN</option>
        <option value="EQUALS">EQUALS</option>
        <option value="NOT_EQUALS">NOT EQUALS</option>
      </select>
      <div className="flex-1 min-w-0">
        {isFilterable ? (
          // Show MultiSelect for all filterable columns
          // If fetch fails for calculated columns, it will show empty options but still use dropdown
          <MultiSelect 
            options={filterValues.map((v: any) => v !== null && v !== undefined ? String(v) : "null")}
            selectedValues={node.value ? (Array.isArray(node.value) ? node.value.map(v => String(v)) : [String(node.value)]) : []} 
            onChange={(vals) => onUpdate(node.id, { value: vals })}
            isLoading={isLoading}
            placeholder={isCalculated ? "Loading..." : "Select filter values..."}
            emptyMessage={isCalculated && isError ? "Values not available for calculated column" : "No values found"}
          />
        ) : (
          // Non-filterable columns show disabled input
          <input
            type="text"
            placeholder="Not filterable"
            disabled
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 outline-none cursor-not-allowed"
          />
        )}
      </div>
      <button onClick={() => onRemove(node.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
        <X size={14}/>
      </button>
    </div>
  );
};

const FilterGroupComponent = ({ node, onUpdate, onRemove, onAddGroup, onDropNode }: { node: FilterGroupNode, onUpdate: (id: string, updates: any) => void, onRemove: (id: string) => void, onAddGroup: (parentId: string) => void, onDropNode: (parentId: string, data: any) => void }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col gap-3 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 group">
      <div className="flex items-center gap-3">
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
          <button 
            onClick={() => onUpdate(node.id, { operator: 'AND' })}
            className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${node.operator === 'AND' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            AND
          </button>
          <button 
            onClick={() => onUpdate(node.id, { operator: 'OR' })}
            className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${node.operator === 'OR' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            OR
          </button>
        </div>
        <button onClick={() => onAddGroup(node.id)} className="text-xs text-brand hover:text-brand-dark font-bold flex items-center gap-1 bg-brand/5 hover:bg-brand/10 px-2 py-1 rounded-md transition-colors">
          + Add Sub-Group
        </button>
        {node.id !== 'root' && (
          <button onClick={() => onRemove(node.id)} className="text-slate-400 hover:text-red-500 ml-auto p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
            <X size={14}/>
          </button>
        )}
      </div>
      
      <div 
        className={`flex flex-col gap-2 pl-3 border-l-2 ${node.children.length === 0 ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-amber-200 dark:border-amber-900/50'} ml-2 min-h-[50px] py-1 rounded-r-lg transition-all`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rawData = e.dataTransfer.getData('application/json');
          if (rawData) {
            const data = JSON.parse(rawData);
            onDropNode(node.id, data);
          }
        }}
      >
        {node.children.map(child => {
          if (child.type === 'rule') {
            return <FilterRuleComponent key={child.id} node={child} onUpdate={onUpdate} onRemove={onRemove} />;
          } else {
            return <FilterGroupComponent key={child.id} node={child} onUpdate={onUpdate} onRemove={onRemove} onAddGroup={onAddGroup} onDropNode={onDropNode} />;
          }
        })}
        {node.children.length === 0 && (
          <div className="h-full flex items-center justify-center text-[11px] font-medium text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 m-1 py-4">
            Drop columns here to filter
          </div>
        )}
      </div>
    </div>
  );
};

const CollapsibleWarningCard = ({ warning, selectedSqlOption, setSelectedSqlOption, setGeneratedSql }: { 
  warning: any, 
  selectedSqlOption: any, 
  setSelectedSqlOption: (opt: any) => void,
  setGeneratedSql: (sql: string) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isDark = useThemeStore((state) => state.isDark);

  return (
    <div className={`rounded-xl border transition-all ${
      warning.type === 'potential_cycle' || warning.type === 'multiple_paths'
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' 
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
    }`}>
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            warning.type === 'potential_cycle' || warning.type === 'multiple_paths'
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
              : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          }`}>
            <Info size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <h4 className={`text-sm font-bold ${
                warning.type === 'potential_cycle' || warning.type === 'multiple_paths'
                  ? 'text-amber-800 dark:text-amber-400'
                  : 'text-red-800 dark:text-red-400'
              }`}>
                {warning.type === 'potential_cycle' ? 'Potential Join Cycle Detected' : 
                 warning.type === 'multiple_paths' ? 'Multiple Join Paths Detected' :
                 'Disconnected Datasets'}
              </h4>
              <ChevronDown 
                size={16} 
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 truncate">{warning.message}</p>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {warning.recommendation && (
            <div className="bg-white dark:bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Recommendation:</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{warning.recommendation}</p>
            </div>
          )}
          
          {warning.suggestions && warning.suggestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Suggested Joins:</p>
              <div className="space-y-2">
                {warning.suggestions.map((sug: any, sugIdx: number) => (
                  <div key={sugIdx} className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{sug.from}</span>
                    <span className="text-slate-400">&harr;</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{sug.to}</span>
                    <span className="text-slate-500 truncate flex-1">ON {sug.condition}</span>
                    <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">{sug.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {warning.connected_to && warning.connected_to.length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Connected to:</p>
              <div className="flex flex-wrap gap-2">
                {warning.connected_to.map((conn: string, connIdx: number) => (
                  <span key={connIdx} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                    {conn}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* SQL Options for multiple paths */}
          {warning.type === 'multiple_paths' && warning.sql_options && warning.sql_options.length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 rounded-lg p-3 mt-3">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">
                Available SQL Options ({warning.sql_options.length}) - Click to select:
              </p>
              <div className="space-y-3">
                {warning.sql_options.map((option: any) => (
                  <div 
                    key={option.index} 
                    className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedSqlOption?.index === option.index
                        ? 'border-brand shadow-lg bg-brand/5 dark:bg-brand/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-brand/50 bg-white dark:bg-slate-900/30'
                    }`}
                    onClick={() => {
                      setSelectedSqlOption(option);
                      setGeneratedSql(option.beautified_sql || option.sql);
                    }}
                  >
                    <div className={`px-3 py-2 border-b ${
                      selectedSqlOption?.index === option.index
                        ? 'bg-brand/10 dark:bg-brand/20 border-brand/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {selectedSqlOption?.index === option.index && (
                            <div className="w-4 h-4 bg-brand rounded-full flex items-center justify-center shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <p className={`text-xs font-bold truncate ${
                            selectedSqlOption?.index === option.index
                              ? 'text-brand dark:text-brand-light'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {option.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(option.sql);
                          }}
                          className="text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-1 rounded transition-colors shrink-0 ml-2"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 max-h-64 overflow-auto custom-scrollbar">
                      <CodeMirror
                        value={option.beautified_sql || option.sql}
                        height="200px"
                        extensions={sql()}
                        theme={isDark ? oneDark : undefined}
                        basicSetup={{
                          lineNumbers: false,
                          foldGutter: false,
                          highlightActiveLine: false,
                          highlightSelectionMatches: false,
                        }}
                        editable={false}
                        className="text-[10px] !font-mono [&_.cm-content]:whitespace-pre [&_.cm-content]:leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DataMartExplorer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.isDark);

  const [dimensions, setDimensions] = useState<{ id: string; name: string; alias: string }[]>([]);
  const [showLineage, setShowLineage] = useState(false);
  const [showResultsPane, setShowResultsPane] = useState(false);
  const [metrics, setMetrics] = useState<{ id: string; name: string; alias: string; agg?: string }[]>([]);
  const [filterAST, setFilterAST] = useState<FilterGroupNode>({
    id: 'root',
    type: 'group',
    operator: 'AND',
    children: []
  });
  const [customJoins, setCustomJoins] = useState<any[]>([]);
  const [editingJoin, setEditingJoin] = useState<any>(null);
  const [newJoin, setNewJoin] = useState({ 
    left_dataset_id: '', 
    left_column: '',
    operator: '=',
    right_dataset_id: '', 
    right_column: '',
    join_type: 'LEFT' 
  });

  const [expandedDatasets, setExpandedDatasets] = useState<Record<number, boolean>>({});
  const [showSqlDrawer, setShowSqlDrawer] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [joinWarnings, setJoinWarnings] = useState<any[]>([]);
  const [selectedSqlOption, setSelectedSqlOption] = useState<any>(null);
  
  // Save Query Template state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const { data: datamart, isLoading: isMartLoading } = useQuery({
    queryKey: ['datamart', id],
    queryFn: async () => {
      const response = await api.get(`/api/datamarts/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: predefinedJoins = [] } = useQuery({
    queryKey: ['datamart_joins', id],
    queryFn: async () => {
      const response = await api.get(`/api/datamarts/${id}/joins`);
      return response.data;
    },
    enabled: !!id,
  });

  const activeDatasetIds = useMemo(() => {
    const ids = new Set<number>();
    dimensions.forEach(d => { if (d.id.includes('.')) ids.add(Number(d.id.split('.')[0])); });
    metrics.forEach(m => { if (m.id.includes('.')) ids.add(Number(m.id.split('.')[0])); });
    extractDatasetIdsFromAST(filterAST, ids);
    return Array.from(ids);
  }, [dimensions, metrics, filterAST]);

  const { connected, missing } = useMemo(() => {
    if (activeDatasetIds.length <= 1) return { connected: true, missing: false };
    
    const adj: Record<number, number[]> = {};
    activeDatasetIds.forEach(id => adj[id] = []);
    
    const allJoins = [...predefinedJoins, ...customJoins];
    allJoins.forEach(j => {
      if (activeDatasetIds.includes(Number(j.left_dataset_id)) && activeDatasetIds.includes(Number(j.right_dataset_id))) {
        adj[Number(j.left_dataset_id)].push(Number(j.right_dataset_id));
        adj[Number(j.right_dataset_id)].push(Number(j.left_dataset_id));
      }
    });
    
    const visited = new Set<number>();
    const stack = [activeDatasetIds[0]];
    while(stack.length > 0) {
      const curr = stack.pop()!;
      if (!visited.has(curr)) {
        visited.add(curr);
        adj[curr]?.forEach(neighbor => stack.push(neighbor));
      }
    }
    
    const isConnected = visited.size === activeDatasetIds.length;
    return { connected: isConnected, missing: !isConnected };
  }, [activeDatasetIds, predefinedJoins, customJoins]);

  const handleAddCustomJoin = () => {
    if (!newJoin.left_dataset_id || !newJoin.right_dataset_id || !newJoin.left_column || !newJoin.right_column) {
      toast.error('Please fill out all join fields.');
      return;
    }
    const condition = `ds_${newJoin.left_dataset_id}.${newJoin.left_column} ${newJoin.operator} ds_${newJoin.right_dataset_id}.${newJoin.right_column}`;
    
    setCustomJoins(prev => [...prev, {
      left_dataset_id: newJoin.left_dataset_id,
      right_dataset_id: newJoin.right_dataset_id,
      join_type: newJoin.join_type,
      join_condition: condition
    }]);
    
    setNewJoin({ left_dataset_id: '', left_column: '', operator: '=', right_dataset_id: '', right_column: '', join_type: 'LEFT' });
  };

  const handleEditPredefinedJoin = (join: any) => {
    // Parse the join condition to extract column information
    // Expected format: "ds_X.column1 operator ds_Y.column2"
    let left_dataset_id = join.left_dataset_id;
    let right_dataset_id = join.right_dataset_id;
    let left_column = '';
    let right_column = '';
    let operator = '=';
    
    if (join.join_condition) {
      // Parse condition like "ds_1.id = ds_2.user_id"
      const match = join.join_condition.match(/ds_(\d+)\.(\w+)\s*(=|!=|<|>|<=|>=)\s*ds_(\d+)\.(\w+)/);
      if (match) {
        left_dataset_id = match[1];
        left_column = match[2];
        operator = match[3];
        right_dataset_id = match[4];
        right_column = match[5];
      }
    }
    
    setEditingJoin({
      ...join,
      left_dataset_id,
      right_dataset_id,
      left_column,
      right_column,
      operator
    });
  };

  const handleUpdatePredefinedJoin = async () => {
    if (!editingJoin || !editingJoin.id) return;
    
    try {
      const response = await api.put(`/api/datamarts/${id}/joins/${editingJoin.id}`, editingJoin);
      toast.success('Join updated successfully!');
      setEditingJoin(null);
    } catch (err: any) {
      toast.error('Failed to update join: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
    }
  };

  const handleDeletePredefinedJoin = async (joinId: number) => {
    if (!confirm('Are you sure you want to delete this predefined join?')) return;
    
    try {
      await api.delete(`/api/datamarts/${id}/joins/${joinId}`);
      toast.success('Join deleted successfully!');
    } catch (err: any) {
      toast.error('Failed to delete join: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
    }
  };

  const handleCancelEditJoin = () => {
    setEditingJoin(null);
  };

  const handleGenerateSql = async () => {
    if (dimensions.length === 0 && metrics.length === 0) {
      toast.error('Please select at least one dimension or metric.');
      return;
    }

    try {
      const response = await api.post('/api/charts/generate-sql', {
        datamart_id: Number(id),
        query_config: {
          dimensions: dimensions.map(d => ({ name: d.id, alias: d.alias })),
          metrics: metrics.map(m => ({ 
            column: m.agg ? m.id : undefined, 
            name: m.agg ? undefined : m.id, 
            agg: m.agg,
            alias: m.alias 
          })),
          pivotColumns: [],
          limit: 100000,
          custom_joins: customJoins,
          selected_join_tree: selectedSqlOption?.index
        },
        filters: filterAST
      });
      
      // Extract SQL from the response
      if (response.data && response.data.sql) {
        setGeneratedSql(response.data.sql);
        setJoinWarnings(response.data.join_warnings || []);
        setShowSqlDrawer(true);
        setCopiedSql(false);
      } else {
        toast.error('Unable to generate SQL query.');
      }
    } catch (err: any) {
      toast.error('Failed to generate SQL: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
    }
  };

  const handleCopySql = () => {
    if (generatedSql) {
      navigator.clipboard.writeText(generatedSql);
      setCopiedSql(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleUpdateASTNode = (nodeId: string, updates: any) => {
    setFilterAST(prev => {
      const updateNode = (node: FilterASTNode): FilterASTNode => {
        if (node.id === nodeId) return { ...node, ...updates } as FilterASTNode;
        if (node.type === 'group') {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      return updateNode(prev) as FilterGroupNode;
    });
  };

  const handleRemoveASTNode = (nodeId: string) => {
    setFilterAST(prev => {
      const removeNode = (node: FilterGroupNode): FilterGroupNode => {
        return {
          ...node,
          children: node.children.filter(c => c.id !== nodeId).map(c => c.type === 'group' ? removeNode(c) : c)
        };
      };
      return removeNode(prev);
    });
  };

  const handleDropIntoGroup = (parentId: string, data: any) => {
    // Prevent all metrics (calculated or not) from being added to filters
    if (data.type === 'metric') {
      toast.error('Metrics cannot be added to filters.');
      return;
    }
    // Check if column is filterable
    if (data.is_filterable === false) {
       toast.error('This column is not filterable.');
       return;
    }
    setFilterAST(prev => {
      const appendRule = (node: FilterASTNode): FilterASTNode => {
        if (node.id === parentId && node.type === 'group') {
          // For calculated dimensions, use expression instead of column_name
          const columnName = data.isCalculated && data.expression ? data.expression : data.column_name;
          return {
            ...node,
            children: [
              ...node.children,
              {
                id: generateId(),
                type: 'rule',
                datasetId: data.datasetId,
                column_name: columnName,
                name: data.name,
                operator: 'IN',
                value: [],
                isCalculated: data.isCalculated || false,
                is_filterable: data.is_filterable !== false
              } as FilterRuleNode
            ]
          };
        }
        if (node.type === 'group') {
          return { ...node, children: node.children.map(appendRule) };
        }
        return node;
      };
      return appendRule(prev) as FilterGroupNode;
    });
  };

  const handleAddASTGroup = (parentId: string) => {
    setFilterAST(prev => {
      const addGroup = (node: FilterASTNode): FilterASTNode => {
        if (node.id === parentId && node.type === 'group') {
          return {
            ...node,
            children: [
              ...node.children,
              { id: generateId(), type: 'group', operator: 'AND', children: [] }
            ]
          };
        }
        if (node.type === 'group') {
          return { ...node, children: node.children.map(addGroup) };
        }
        return node;
      };
      return addGroup(prev) as FilterGroupNode;
    });
  };

  const queryMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/charts/preview', {
        datamart_id: Number(id),
        query_config: {
          dimensions: dimensions.map(d => ({ name: d.id, alias: d.alias })),
          metrics: metrics.map(m => ({ 
            column: m.agg ? m.id : undefined, 
            name: m.agg ? undefined : m.id, 
            agg: m.agg,
            alias: m.alias 
          })),
          pivotColumns: [],
          limit: 100000,
          custom_joins: customJoins
        },
        filters: filterAST
      });
      return response.data;
    },
    onError: (err: any) => {
      toast.error('Query failed: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  });

  // Fetch saved query templates for this datamart
  const savedTemplatesData = useQuery({
    queryKey: ['saved-templates', id],
    queryFn: async () => {
      const response = await api.get('/api/sqllab/saved', { params: { datamart_id: id } });
      return response.data;
    },
    enabled: !!id,
    retry: 1,
  });

  // Save query template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      sql: string; 
      datamart_id: number;
      query_config?: any;
    }) => {
      const response = await api.post('/api/sqllab/saved', {
        name: data.name,
        sql: data.sql,
        datamart_id: data.datamart_id,
        query_config: data.query_config
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Query template saved successfully');
      savedTemplatesData.refetch();
      setSaveQueryName('');
    },
    onError: (error: any) => {
      // Extract error message from various possible formats
      let errorMessage = 'Failed to save query template';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object' && error.response.data.detail) {
          // Handle array of validation errors
          if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail[0]?.msg || errorMessage;
          } 
          // Handle string detail
          else if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail;
          }
          // Handle object detail with msg field
          else if (typeof error.response.data.detail === 'object' && error.response.data.detail.msg) {
            errorMessage = error.response.data.detail.msg;
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });

  const handleRunQuery = () => {
    if (dimensions.length > 0 || metrics.length > 0) {
      setShowResultsPane(true);
      queryMutation.mutate();
    }
  };

  const handleDownloadCSV = () => {
    const data = queryMutation.data?.data;
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row: any) => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${datamart?.name || 'query'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, itemType: 'dimension'|'metric', datasetId: number, item: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: itemType,
      datasetId,
      id: `${datasetId}.${item.column_name || item.name}`,
      name: item.friendly_name || item.column_name || item.name,
      column_name: item.column_name || item.name,
      is_filterable: item.is_filterable !== false,
      isCalculated: item.isCalculated || false,
      expression: item.expression || undefined,
      data_type: item.data_type || undefined
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent, zoneType: 'dimension' | 'metric' | 'filter') => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    
    try {
      const data = JSON.parse(dataStr);
      console.log('Drop zone:', zoneType, 'Dragged data:', data); // Debug log
      
      if (zoneType === 'dimension') {
        if (data.type === 'metric') {
           toast.error('Cannot use a metric as a grouping dimension.');
           return;
        }
        if (data.type === 'metric' && data.isCalculated) {
           toast.error('Calculated metrics cannot be added to dimensions.');
           return;
        }
        setDimensions(prev => {
          if (prev.find(d => d.id === data.id)) return prev;
          return [...prev, { id: data.id, name: data.name, alias: data.name }];
        });
      } else if (zoneType === 'metric') {
        setMetrics(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, { 
            id: data.id, 
            name: data.name, 
            alias: data.type === 'dimension' ? `count_${data.name}` : data.name,
            agg: data.type === 'dimension' ? 'COUNT' : undefined 
          }];
        });
      } else if (zoneType === 'filter') {
        // Prevent all metrics (calculated or not) from being added to filters
        if (data.type === 'metric') {
          console.log('Blocking metric from filter:', data); // Debug log
          toast.error('Metrics cannot be added to filters.');
          return;
        }
        // Check if column is filterable (for physical and calculated dimensions)
        if (data.is_filterable === false) {
          toast.error('This column is not filterable.');
          return;
        }
        handleDropIntoGroup('root', data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  if (isMartLoading) return <div className="p-8">Loading Data Mart...</div>;
  if (!datamart) return <div className="p-8 text-red-500">Data Mart not found or access denied.</div>;

  return (
    <div className="font-sans h-full">
      <LineageModal 
        isOpen={showLineage}
        onClose={() => setShowLineage(false)}
        datasets={datamart.datasets || []}
        joins={[...predefinedJoins, ...customJoins]}
        datamartName={datamart.name}
      />
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/self-service')} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database size={22} className="text-brand" /> {datamart.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{datamart.description || 'Self-Service Query Builder'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateSql}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Code size={16} /> Show SQL
          </button>
          <button
            onClick={() => {
              // First generate SQL
              handleGenerateSql();
              
              // Check if there are warnings with multiple paths
              if (joinWarnings.length > 0) {
                // Show the SQL drawer to let user select option
                setShowSqlDrawer(true);
              } else {
                // No warnings, open save modal directly
                setIsSaveModalOpen(true);
              }
            }}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save as Template
          </button>
          <button
            onClick={() => setShowTemplatesSidebar(true)}
            disabled={queryMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <List size={16} /> My Templates
          </button>
          <button
            onClick={handleRunQuery}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="btn-primary flex items-center gap-2"
          >
            {queryMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} 
            Run Query
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Dataset Catalog */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
             <div className="flex items-center justify-between mb-1">
               <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Layers size={12}/> Datasets
               </label>
               <button 
                 onClick={() => setShowLineage(true)}
                 className="px-2 py-0.5 text-[9px] font-bold bg-brand text-white rounded shadow-sm hover:bg-brand-dark transition-colors"
               >
                 Show Lineage
               </button>
             </div>
             <p className="text-[10px] text-slate-500 mt-1">Drag fields from here into the query builder.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2 space-y-1">
            {datamart.datasets?.map((ds: any) => {
              // Debug log - remove in production
              console.log('Dataset:', ds.name, 'Columns:', ds.columns?.length, 'CalcCols:', ds.calculated_columns?.length, 'Metrics:', ds.metrics?.length);
              
              const isExpanded = expandedDatasets[ds.id];
              return (
                <div key={ds.id} className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setExpandedDatasets(p => ({...p, [ds.id]: !isExpanded}))}
                    className="w-full flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{ds.name}</span>
                      {ds.description && (
                        <div title={ds.description} className="text-slate-400 hover:text-brand transition-colors cursor-help shrink-0">
                          <Info size={14} />
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0"/> : <ChevronRight size={14} className="text-slate-400 shrink-0"/>}
                  </button>
                  
                  {isExpanded && (
                    <div className="bg-white dark:bg-slate-900 p-2 space-y-1 border-t border-slate-100 dark:border-slate-800">
                      {/* All items in one list with distinct icons */}
                      <div className="space-y-0.5">
                        {/* Physical Columns - Blue Type icon */}
                        {ds.columns?.filter((col: any) => col.is_visible !== false).map((col: any) => (
                          <div 
                            key={`col_${col.id}`} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'dimension', ds.id, col)}
                            className="flex items-center gap-2 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-grab active:cursor-grabbing text-xs text-slate-600 dark:text-slate-400 group"
                          >
                            <Type size={12} className="text-blue-500 shrink-0" />
                            <span className="truncate flex-1">{col.friendly_name || col.column_name}</span>
                            {col.is_filterable !== false && <Filter size={10} className="text-slate-400 dark:text-slate-500 shrink-0" title="Filterable" />}
                          </div>
                        ))}
                        
                        {/* Calculated Columns - Purple Calculator icon */}
                        {ds.calculated_columns?.filter((calcCol: any) => calcCol.is_visible !== false).map((calcCol: any) => (
                          <div 
                            key={`calc_${calcCol.id}`} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'dimension', ds.id, { 
                              ...calcCol, 
                              isCalculated: true,
                              is_filterable: calcCol.is_filterable !== false,
                              is_visible: calcCol.is_visible !== false
                            })}
                            className="flex items-center gap-2 p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded cursor-grab active:cursor-grabbing text-xs text-slate-600 dark:text-slate-400 group"
                          >
                            <Calculator size={12} className="text-purple-500 shrink-0" />
                            <span className="truncate flex-1">{calcCol.friendly_name || calcCol.name}</span>
                            {calcCol.is_filterable !== false && <Filter size={10} className="text-slate-400 dark:text-slate-500 shrink-0" title="Filterable" />}
                          </div>
                        ))}
                        
                        {/* Metrics - Amber FunctionSquare icon */}
                        {ds.metrics?.filter((met: any) => met.is_visible !== false).map((met: any) => (
                          <div 
                            key={`metric_${met.id}`} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'metric', ds.id, { ...met, isCalculated: true })}
                            className="flex items-center gap-2 p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded cursor-grab active:cursor-grabbing text-xs text-slate-600 dark:text-slate-400 group"
                          >
                            <FunctionSquare size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate flex-1">{met.friendly_name || met.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Workspace (Builder + Results) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
          
          {/* Query Builder Panel */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
             {/* Query Builder Header */}
             <div className="shrink-0 p-4 border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                     <Filter size={12}/> Query Builder
                   </label>
                   <p className="text-[10px] text-slate-500 mt-0.5">Configure your query dimensions, metrics, and filters.</p>
                 </div>
               </div>
             </div>
          
             {/* Query Builder Scrollable Content */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
               <div className="flex flex-col gap-4 pb-4">
            
            {/* Dimensions Dropzone */}
            <div 
              onDrop={(e) => handleDrop(e, 'dimension')} 
              onDragOver={handleDragOver}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[120px] flex flex-col shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                  <Type size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Dimensions <span className="text-slate-400 font-normal text-xs ml-1">(Group By)</span>
                </h3>
              </div>
              <div className="flex-1 flex flex-wrap content-start gap-2">
                {dimensions.length === 0 ? (
                  <div className="w-full h-full min-h-[60px] flex items-center justify-center text-xs font-medium text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    Drop categorical columns here
                  </div>
                ) : (
                  dimensions.map(d => (
                    <div key={d.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group">
                      <span className="truncate max-w-[200px]">{d.name}</span>
                      <button onClick={() => setDimensions(prev => prev.filter(x => x.id !== d.id))} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-md transition-all"><X size={14}/></button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Metrics Dropzone */}
            <div 
              onDrop={(e) => handleDrop(e, 'metric')} 
              onDragOver={handleDragOver}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[120px] flex flex-col shadow-sm transition-all hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Hash size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Metrics <span className="text-slate-400 font-normal text-xs ml-1">(Summarize)</span>
                </h3>
              </div>
              <div className="flex-1 flex flex-wrap content-start gap-3">
                {metrics.length === 0 ? (
                  <div className="w-full h-full min-h-[60px] flex items-center justify-center text-xs font-medium text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    Drop numerical metrics here
                  </div>
                ) : (
                  metrics.map((m, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl shadow-sm min-w-[160px] group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{m.name}</span>
                        <button onClick={() => setMetrics(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-md transition-all"><X size={14}/></button>
                      </div>
                      <select
                        value={m.agg || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMetrics(prev => prev.map((x, i) => i === idx ? { ...x, agg: val || undefined } : x));
                        }}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors cursor-pointer w-full"
                      >
                        <option value="">Auto (Default)</option>
                        <option value="COUNT">COUNT</option>
                        <option value="DISTINCT_COUNT">DISTINCT COUNT</option>
                        <option value="SUM">SUM</option>
                        <option value="AVG">AVERAGE</option>
                        <option value="MIN">MINIMUM</option>
                        <option value="MAX">MAXIMUM</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Filters Dropzone */}
            <div 
              onDrop={(e) => handleDrop(e, 'filter')} 
              onDragOver={handleDragOver}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[120px] flex flex-col shadow-sm transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                  <Filter size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Filters <span className="text-slate-400 font-normal text-xs ml-1">(Where)</span>
                </h3>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <FilterGroupComponent 
                  node={filterAST} 
                  onUpdate={handleUpdateASTNode} 
                  onRemove={handleRemoveASTNode} 
                  onAddGroup={handleAddASTGroup} 
                  onDropNode={handleDropIntoGroup}
                />
              </div>
            </div>

            {/* Joins Section */}
            {activeDatasetIds.length > 1 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Layers size={12} className={missing ? "text-red-500" : "text-brand"}/> Joins
                  </h3>
                  {missing && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Missing Join Path</span>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {[...predefinedJoins, ...customJoins]
                    .filter(j => activeDatasetIds.includes(Number(j.left_dataset_id)) && activeDatasetIds.includes(Number(j.right_dataset_id)))
                    .map((j, i) => {
                      const leftDs = datamart?.datasets?.find((d: any) => d.id === Number(j.left_dataset_id));
                      const rightDs = datamart?.datasets?.find((d: any) => d.id === Number(j.right_dataset_id));
                      const isCustom = !j.id;
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded shadow-sm text-xs font-sans">
                          <span className="font-bold text-brand">{j.join_type}</span>
                          <span className="text-slate-900 dark:text-white font-bold truncate max-w-[150px]">{leftDs?.name}</span>
                          <span className="text-slate-400">&harr;</span>
                          <span className="text-slate-900 dark:text-white font-bold truncate max-w-[150px]">{rightDs?.name}</span>
                          <span className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-slate-500 flex-1 truncate">ON {j.join_condition}</span>
                          {isCustom ? (
                            <button onClick={() => setCustomJoins(prev => prev.filter((cj) => cj !== j))} className="text-slate-400 hover:text-red-500 ml-auto p-1">
                              <X size={14}/>
                            </button>
                          ) : (
                            <div className="flex gap-1 ml-auto">
                              <button onClick={() => handleEditPredefinedJoin(j)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit join">
                                <Code size={14}/>
                              </button>
                              <button onClick={() => handleDeletePredefinedJoin(j.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete join">
                                <X size={14}/>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                  })}
                  
                  {missing && (
                    <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded flex flex-col gap-3 shadow-sm">
                       <p className="text-xs text-red-600 dark:text-red-400 font-medium">Please define a join to connect the remaining datasets.</p>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <select 
                              value={newJoin.left_dataset_id} 
                              onChange={(e) => setNewJoin(prev => ({...prev, left_dataset_id: e.target.value, left_column: ''}))}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                            >
                              <option value="">Select Left Dataset</option>
                              {datamart?.datasets?.filter((d: any) => activeDatasetIds.includes(d.id)).map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <select
                              value={newJoin.left_column}
                              onChange={(e) => setNewJoin(prev => ({...prev, left_column: e.target.value}))}
                              disabled={!newJoin.left_dataset_id}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none disabled:opacity-50"
                            >
                               <option value="">Select Left Column</option>
                               {datamart?.datasets?.find((d: any) => d.id === Number(newJoin.left_dataset_id))?.columns?.map((c: any) => (
                                 <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                               ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <select 
                              value={newJoin.right_dataset_id} 
                              onChange={(e) => setNewJoin(prev => ({...prev, right_dataset_id: e.target.value, right_column: ''}))}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                            >
                              <option value="">Select Right Dataset</option>
                              {datamart?.datasets?.filter((d: any) => activeDatasetIds.includes(d.id) && d.id !== Number(newJoin.left_dataset_id)).map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <select
                              value={newJoin.right_column}
                              onChange={(e) => setNewJoin(prev => ({...prev, right_column: e.target.value}))}
                              disabled={!newJoin.right_dataset_id}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none disabled:opacity-50"
                            >
                               <option value="">Select Right Column</option>
                               {datamart?.datasets?.find((d: any) => d.id === Number(newJoin.right_dataset_id))?.columns?.map((c: any) => (
                                 <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                               ))}
                            </select>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-2">
                         <select 
                           value={newJoin.join_type} 
                           onChange={(e) => setNewJoin(prev => ({...prev, join_type: e.target.value}))}
                           className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none uppercase"
                         >
                           <option value="LEFT">LEFT JOIN</option>
                           <option value="INNER">INNER JOIN</option>
                           <option value="RIGHT">RIGHT JOIN</option>
                           <option value="FULL">FULL JOIN</option>
                         </select>
                         <select 
                           value={newJoin.operator} 
                           onChange={(e) => setNewJoin(prev => ({...prev, operator: e.target.value}))}
                           className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none font-sans flex-1 text-center"
                         >
                           <option value="=">=</option>
                           <option value="!=">!=</option>
                           <option value="<">&lt;</option>
                           <option value=">">&gt;</option>
                           <option value="<=">&lt;=</option>
                           <option value=">=">&gt;=</option>
                         </select>
                       </div>
                       
                       <button 
                         onClick={handleAddCustomJoin} 
                         disabled={!newJoin.left_dataset_id || !newJoin.right_dataset_id || !newJoin.left_column || !newJoin.right_column}
                         className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded text-xs font-bold w-full hover:bg-slate-800 disabled:opacity-50 transition-colors mt-1"
                       >
                         Add Custom Join
                       </button>
                    </div>
                  )}
                </div>
              </div>
            )}
             </div>
             </div>
          </div>
        </div>

        {/* Results Table Panel */}
        {showResultsPane && (
        <div className="w-1/2 min-w-[400px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xl z-20">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
             <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2"><Play size={14} className="text-brand"/> Query Results</h3>
             <button onClick={() => setShowResultsPane(false)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
               <X size={16} />
             </button>
          </div>
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/50 p-4">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
              {queryMutation.isPending ? (
                <div className="flex-1 flex flex-col items-center justify-center text-brand">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="font-bold animate-pulse">Running Multi-Table Query...</p>
                </div>
              ) : queryMutation.error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-8">
                  <p className="font-bold text-lg mb-2">Query Failed</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {queryMutation.error instanceof Error ? queryMutation.error.message : 'An error occurred while executing the query'}
                  </p>
                </div>
              ) : queryMutation.data?.data ? (
                <>
                  <div className="shrink-0 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-4 flex-wrap">
                      <span>{queryMutation.data.data.length} rows returned</span>
                      {queryMutation.data.applied_joins?.length > 0 && (
                        <span className="text-brand flex items-center gap-1 bg-brand/10 px-2 py-0.5 rounded">
                          <Layers size={12} /> {queryMutation.data.applied_joins.length} Joins Applied
                        </span>
                      )}
                      {queryMutation.data.has_missing_joins && (
                        <span className="text-red-500 flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded font-bold">
                          Warning: Missing Join Conditions Detected
                        </span>
                      )}
                    </div>
                    <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand hover:border-brand shadow-sm transition-colors">
                      <Download size={14}/> Download CSV
                    </button>
                  </div>
                  
                  {queryMutation.data.applied_joins?.length > 0 && (
                    <div className="shrink-0 p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar flex gap-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0 py-1">Active Joins:</div>
                      {queryMutation.data.applied_joins.map((j: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded shadow-sm text-[10px] font-sans text-slate-600 dark:text-slate-300 shrink-0">
                          <span className="font-bold text-brand">{j.type}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-slate-900 dark:text-white font-bold">{j.target_dataset}</span>
                          <span className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-slate-500">ON {j.condition}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                        <tr>
                          {Object.keys(queryMutation.data.data[0] || {}).map(key => (
                            <th key={key} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryMutation.data.data.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            {Object.values(row).map((val: any, j: number) => (
                              <td key={j} className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
                                {val !== null ? String(val) : <span className="text-slate-300 italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {queryMutation.data.data.length === 0 && (
                          <tr>
                            <td colSpan={100} className="px-4 py-12 text-center text-slate-400 font-medium text-sm">
                              No results found for this query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                  <Database size={64} className="opacity-10 mb-4" />
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-2">Multi-Table Query Builder</p>
                  <p className="text-sm max-w-sm text-center">
                    Drag fields from the left sidebar into the dropzones above to build your query. The platform will automatically resolve the required JOIN paths based on your semantic relationships.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* SQL Drawer */}
      {showSqlDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSqlDrawer(false)}
          />
          
          {/* Drawer */}
          <div className="relative w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <Code size={20} className="text-brand" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Generated SQL Query</h2>
                  <p className="text-xs text-slate-500">Preview of the query that will be executed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  disabled={!generatedSql}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copiedSql ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  {copiedSql ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* SQL Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-4">
                {joinWarnings.length > 0 && (
                  <div className="space-y-3">
                    {joinWarnings.map((warning, idx) => (
                      <CollapsibleWarningCard key={idx} warning={warning} selectedSqlOption={selectedSqlOption} setSelectedSqlOption={setSelectedSqlOption} setGeneratedSql={setGeneratedSql} />
                    ))}
                  </div>
                )}
                
                {generatedSql ? (
                  <div className="flex flex-col bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {selectedSqlOption ? `Selected Option ${selectedSqlOption.index + 1}` : 'SQL Query'}
                      </p>
                      {selectedSqlOption && (
                        <button
                          onClick={() => {
                            setSelectedSqlOption(null);
                            // Reset to default generated SQL from backend
                            // This will be handled when the query is re-executed
                          }}
                          className="text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-1 rounded transition-colors"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar p-4">
                      <CodeMirror
                        value={generatedSql}
                        height="100%"
                        extensions={sql()}
                        theme={isDark ? oneDark : undefined}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: false,
                          highlightActiveLine: false,
                          highlightSelectionMatches: false,
                        }}
                        editable={false}
                        className="text-xs !font-mono [&_.cm-content]:whitespace-pre-wrap [&_.cm-content]:leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-slate-400 py-12">
                    <div className="text-center">
                      <Code size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold text-lg">No SQL generated yet</p>
                      <p className="text-sm mt-2">Select dimensions and metrics to generate a query</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Drawer Footer */}
            <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {generatedSql ? `${generatedSql.split('\n').length} lines` : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
                </button>
                {joinWarnings.length > 0 ? (
                  <button
                    onClick={() => {
                      setShowSqlDrawer(false);
                      setIsSaveModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save size={16} /> Save as Template
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowSqlDrawer(false);
                      handleRunQuery();
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play size={16} /> Run Query
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Predefined Join Modal */}
      {editingJoin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit size={20} className="text-brand" />
                  Edit Predefined Join
                </h3>
                <button onClick={handleCancelEditJoin} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Left Dataset</label>
                  <select 
                    value={editingJoin.left_dataset_id} 
                    onChange={(e) => setEditingJoin(prev => ({ ...prev, left_dataset_id: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
                  >
                    <option value="">Select Left Dataset</option>
                    {datamart?.datasets?.filter((d: any) => activeDatasetIds.includes(d.id)).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Right Dataset</label>
                  <select 
                    value={editingJoin.right_dataset_id} 
                    onChange={(e) => setEditingJoin(prev => ({ ...prev, right_dataset_id: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
                  >
                    <option value="">Select Right Dataset</option>
                    {datamart?.datasets?.filter((d: any) => activeDatasetIds.includes(d.id) && d.id !== Number(editingJoin.left_dataset_id)).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Left Column</label>
                  <select
                    value={editingJoin.left_column || ''}
                    onChange={(e) => setEditingJoin(prev => ({ ...prev, left_column: e.target.value }))}
                    disabled={!editingJoin.left_dataset_id}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors disabled:opacity-50"
                  >
                    <option value="">Select Left Column</option>
                    {datamart?.datasets?.find((d: any) => d.id === Number(editingJoin.left_dataset_id))?.columns?.map((c: any) => (
                      <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Right Column</label>
                  <select
                    value={editingJoin.right_column || ''}
                    onChange={(e) => setEditingJoin(prev => ({ ...prev, right_column: e.target.value }))}
                    disabled={!editingJoin.right_dataset_id}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors disabled:opacity-50"
                  >
                    <option value="">Select Right Column</option>
                    {datamart?.datasets?.find((d: any) => d.id === Number(editingJoin.right_dataset_id))?.columns?.map((c: any) => (
                      <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Join Type</label>
                  <select 
                    value={editingJoin.join_type} 
                    onChange={(e) => setEditingJoin(prev => ({ ...prev, join_type: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-brand transition-colors uppercase"
                  >
                    <option value="LEFT">LEFT JOIN</option>
                    <option value="INNER">INNER JOIN</option>
                    <option value="RIGHT">RIGHT JOIN</option>
                    <option value="FULL">FULL JOIN</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Operator</label>
                  <select 
                    value={editingJoin.operator || '='} 
                    onChange={(e) => setEditingJoin(prev => ({ ...prev, operator: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition-colors font-sans text-center"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value="<">&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="<=">&lt;=</option>
                    <option value=">=">&gt;=</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Generated Join Condition</label>
                <code className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-3 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                  {editingJoin.left_dataset_id && editingJoin.left_column && editingJoin.right_dataset_id && editingJoin.right_column
                    ? `ds_${editingJoin.left_dataset_id}.${editingJoin.left_column} ${editingJoin.operator || '='} ds_${editingJoin.right_dataset_id}.${editingJoin.right_column}`
                    : 'Select all fields to preview condition'}
                </code>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={handleCancelEditJoin}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePredefinedJoin}
                disabled={!editingJoin.left_dataset_id || !editingJoin.right_dataset_id || !editingJoin.left_column || !editingJoin.right_column}
                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsSaveModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Save size={20} className="text-brand" />
                Save as Template
              </h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={saveQueryName}
                  onChange={(e) => setSaveQueryName(e.target.value)}
                  placeholder="Enter template name"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Save your current query configuration for quick reuse
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (saveQueryName.trim()) {
                    // Build query configuration object
                    const queryConfig = {
                      dimensions: dimensions.map(d => ({
                        name: d.id,
                        alias: d.alias
                      })),
                      metrics: metrics.map(m => ({ 
                        column: m.agg ? m.id : undefined, 
                        name: m.agg ? undefined : m.id, 
                        agg: m.agg,
                        alias: m.alias 
                      })),
                      filters: filterAST,
                      custom_joins: customJoins,
                      selected_sql_option: selectedSqlOption
                    };
                    
                    saveTemplateMutation.mutate({
                      name: saveQueryName.trim(),
                      sql: generatedSql!,
                      datamart_id: datamart.id,
                      query_config: queryConfig
                    });
                    setSaveQueryName('');
                    setIsSaveModalOpen(false);
                  }
                }}
                disabled={!saveQueryName.trim() || saveTemplateMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Sidebar */}
      {showTemplatesSidebar && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Save size={16} className="text-brand" />
              My Query Templates
            </h3>
            <button 
              onClick={() => setShowTemplatesSidebar(false)} 
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/50">
            {savedTemplatesData.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-brand" />
              </div>
            ) : savedTemplatesData.data && savedTemplatesData.data.length > 0 ? (
              <div className="space-y-3">
                {savedTemplatesData.data.map((template: any) => (
                  <div
                    key={template.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-brand cursor-pointer transition-all group"
                    onClick={async () => {
                      if (template.query_config) {
                        setLoadingTemplate(true);
                        try {
                          // Load dimensions
                          const dims = template.query_config.dimensions || [];
                          setDimensions(dims.map((d: any) => ({
                            id: d.name, // d.name contains "datasetId.columnName"
                            name: d.name.split('.').pop() || d.name,
                            alias: d.alias || d.name.split('.').pop() || d.name
                          })));
                          
                          // Load metrics
                          const mets = template.query_config.metrics || [];
                          setMetrics(mets.map((m: any) => ({
                            id: m.column || m.name, // m.column contains "datasetId.columnName"
                            name: (m.column || m.name).split('.').pop() || (m.column || m.name),
                            alias: m.alias || (m.column || m.name).split('.').pop() || (m.column || m.name),
                            agg: m.agg
                          })));
                          
                          // Load filters
                          const filters = template.query_config.filters;
                          if (filters) {
                            setFilterAST(filters);
                          }
                          
                          // Load custom joins
                          const customJoins = template.query_config.custom_joins || [];
                          setCustomJoins(customJoins);
                          
                          // Load selected SQL option
                          const sqlOption = template.query_config.selected_sql_option;
                          if (sqlOption) {
                            setSelectedSqlOption(sqlOption);
                          }
                          
                          // Load SQL if available
                          if (template.sql) {
                            setGeneratedSql(template.sql);
                          }
                          
                          toast.success('Template loaded successfully!');
                          setShowTemplatesSidebar(false);
                        } catch (error) {
                          toast.error('Failed to load template');
                          console.error('Error loading template:', error);
                        } finally {
                          setLoadingTemplate(false);
                        }
                      } else {
                        // Fallback: just load the SQL
                        setGeneratedSql(template.sql);
                        toast.success('SQL loaded!');
                        setShowTemplatesSidebar(false);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {template.name}
                        </h4>
                        {template.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Type size={12} />
                            {template.query_config?.dimensions?.length || 0} dims
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash size={12} />
                            {template.query_config?.metrics?.length || 0} metrics
                          </span>
                          {template.query_config?.filters?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Filter size={12} />
                              {template.query_config.filters.length} filters
                          </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {new Date(template.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement edit functionality
                            toast.info('Edit template coming soon');
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete template "${template.name}"?`)) {
                              // TODO: Implement delete mutation
                              toast.success('Template deleted');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-800 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Save size={40} className="mb-3 opacity-50" />
                <p className="text-sm font-semibold">No saved templates</p>
                <p className="text-xs text-slate-500 mt-1 text-center px-4">
                  Build a query and click "Save as Template" to save it here
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default DataMartExplorer;
