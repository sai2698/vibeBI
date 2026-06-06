import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { GitMerge, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Dataset {
  id: number;
  name: string;
}

interface DatasetJoin {
  id: number;
  left_dataset_id: number;
  right_dataset_id: number;
  join_type: string;
  join_condition: string;
}

interface Props {
  datasetId: number;
  datasets: Dataset[];
}

const RelationshipsTab: React.FC<Props> = ({ datasetId, datasets }) => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [rightDatasetId, setRightDatasetId] = useState<string>('');
  const [joinType, setJoinType] = useState('LEFT');
  const [leftColumn, setLeftColumn] = useState('');
  const [operator, setOperator] = useState('=');
  const [rightColumn, setRightColumn] = useState('');

  const { data: leftDataset, isLoading: isLeftLoading } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => (await api.get(`/api/datasets/${datasetId}`)).data
  });

  const { data: rightDataset, isLoading: isRightLoading } = useQuery({
    queryKey: ['dataset', rightDatasetId],
    queryFn: async () => (await api.get(`/api/datasets/${rightDatasetId}`)).data,
    enabled: !!rightDatasetId
  });

  const { data: joins = [], isLoading: isJoinsLoading } = useQuery<any[]>({
    queryKey: ['joins', datasetId],
    queryFn: async () => {
      const r = await api.get(`/api/datasets/${datasetId}/joins`);
      return r.data;
    }
  });

  const createJoinMut = useMutation({
    mutationFn: (data: any) => api.post(`/api/datasets/${datasetId}/joins`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joins'] });
      setIsAdding(false);
      setRightDatasetId('');
      setLeftColumn('');
      setRightColumn('');
      setOperator('=');
      toast.success('Join added successfully');
    },
    onError: () => toast.error('Failed to add join')
  });

  const deleteJoinMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/datasets/joins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joins'] });
      toast.success('Join deleted');
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leftColumn || !rightColumn || !rightDatasetId) {
      toast.error("Please select columns for both datasets");
      return;
    }
    const condition = `ds_${datasetId}.${leftColumn} ${operator} ds_${rightDatasetId}.${rightColumn}`;
    createJoinMut.mutate({
      left_dataset_id: datasetId,
      right_dataset_id: Number(rightDatasetId),
      join_type: joinType,
      join_condition: condition
    });
  };

  const getDatasetName = (id: number) => (datasets ?? []).find(d => d.id === id)?.name || `Unknown (${id})`;

  const safeLeftColumns = Array.isArray(leftDataset?.columns) ? leftDataset.columns : [];
  const safeRightColumns = Array.isArray(rightDataset?.columns) ? rightDataset.columns : [];
  const safeJoins = Array.isArray(joins) ? joins : [];

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitMerge size={20} className="text-brand dark:text-brand-light" /> Join Relationships
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define how this dataset joins with other datasets to enable multi-table visual queries.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition shadow-lg shadow-brand/10"
          >
            <Plus size={16} /> Add Join
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">New Join Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Target Dataset</label>
              <select
                required
                value={rightDatasetId}
                onChange={e => {
                  setRightDatasetId(e.target.value);
                  setRightColumn('');
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="">Select dataset...</option>
                {(datasets ?? []).filter(d => d.id !== datasetId).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Join Type</label>
              <select
                value={joinType}
                onChange={e => setJoinType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand"
              >
                <option value="LEFT">LEFT JOIN</option>
                <option value="INNER">INNER JOIN</option>
                <option value="RIGHT">RIGHT JOIN</option>
                <option value="FULL">FULL OUTER JOIN</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Join Condition</label>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <select
                  required
                  value={leftColumn}
                  onChange={e => setLeftColumn(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand"
                >
                  <option value="">Select source column...</option>
                  {safeLeftColumns.map((c: any) => (
                    <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                  ))}
                </select>
                <select
                  value={operator}
                  onChange={e => setOperator(e.target.value)}
                  className="w-full md:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-brand"
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                </select>
                <div className="w-full relative">
                  {isRightLoading && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="animate-spin text-slate-400" size={14} />
                    </div>
                  )}
                  <select
                    required
                    disabled={!rightDatasetId || isRightLoading}
                    value={rightColumn}
                    onChange={e => setRightColumn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-slate-50 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand disabled:opacity-50"
                  >
                    <option value="">Select target column...</option>
                    {safeRightColumns.map((c: any) => (
                      <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                This configures the equality condition between the two datasets.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createJoinMut.isPending}
              className="flex items-center gap-1 px-4 py-2 bg-brand text-white hover:bg-brand-dark rounded-lg text-xs font-bold transition shadow-lg shadow-brand/10 disabled:opacity-50"
            >
              {createJoinMut.isPending ? 'Saving...' : 'Save Join'}
            </button>
          </div>
        </form>
      )}

      {isJoinsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-brand dark:text-brand-light" size={24} />
        </div>
      ) : safeJoins.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center mx-auto mb-4">
            <GitMerge size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="font-semibold text-xs text-slate-500 dark:text-slate-400">No Joins Defined</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
            Connect tables together using key columns to enable unified reporting and drill-downs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {safeJoins.map(join => {
            const isLeft = join.left_dataset_id === datasetId;
            const targetId = isLeft ? join.right_dataset_id : join.left_dataset_id;
            
            return (
              <div key={join.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md dark:hover:shadow-black/25 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-750">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{join.join_type}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white mb-1 truncate">
                      {isLeft ? 'Target: ' : 'Source: '} {getDatasetName(targetId)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code className="text-[10px] font-mono bg-slate-50 dark:bg-slate-900 text-brand dark:text-brand-light px-2 py-1 rounded select-all break-all">
                        ON {join.join_condition}
                      </code>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this join relationship?')) {
                      deleteJoinMut.mutate(join.id);
                    }
                  }}
                  disabled={deleteJoinMut.isPending}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors ml-4 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RelationshipsTab;
