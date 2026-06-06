import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { GitMerge, Plus, Trash2 } from 'lucide-react';
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

  const { data: leftDataset } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => (await api.get(`/api/datasets/${datasetId}`)).data
  });

  const { data: rightDataset } = useQuery({
    queryKey: ['dataset', rightDatasetId],
    queryFn: async () => (await api.get(`/api/datasets/${rightDatasetId}`)).data,
    enabled: !!rightDatasetId
  });

  const { data: joins = [], isLoading } = useQuery<any[]>({
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
    if (!leftColumn || !rightColumn) {
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

  const getDatasetName = (id: number) => datasets.find(d => d.id === id)?.name || `Unknown (${id})`;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitMerge size={20} className="text-brand" /> Join Relationships
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define how this dataset joins with other datasets to enable multi-table visual queries.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Add Join
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">New Join Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Target Dataset</label>
              <select
                required
                value={rightDatasetId}
                onChange={e => setRightDatasetId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">Select dataset...</option>
                {datasets.filter(d => d.id !== datasetId).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Join Type</label>
              <select
                value={joinType}
                onChange={e => setJoinType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="LEFT">LEFT JOIN</option>
                <option value="INNER">INNER JOIN</option>
                <option value="RIGHT">RIGHT JOIN</option>
                <option value="FULL">FULL OUTER JOIN</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 mb-1">Join Condition</label>
              <div className="flex items-center gap-2">
                <select
                  required
                  value={leftColumn}
                  onChange={e => setLeftColumn(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">Select source column...</option>
                  {leftDataset?.columns?.map((c: any) => (
                    <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                  ))}
                </select>
                <select
                  value={operator}
                  onChange={e => setOperator(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-brand"
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                </select>
                <select
                  required
                  disabled={!rightDatasetId}
                  value={rightColumn}
                  onChange={e => setRightColumn(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
                >
                  <option value="">Select target column...</option>
                  {rightDataset?.columns?.map((c: any) => (
                    <option key={c.column_name} value={c.column_name}>{c.friendly_name || c.column_name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This configures the equality condition between the two datasets.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button type="submit" disabled={createJoinMut.isPending} className="btn-primary py-2 px-4 text-sm">Save Join</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>
      ) : joins.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <GitMerge size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No joins defined yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {joins.map(join => {
            const isLeft = join.left_dataset_id === datasetId;
            const targetId = isLeft ? join.right_dataset_id : join.left_dataset_id;
            
            return (
              <div key={join.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-black text-slate-500 uppercase">{join.join_type}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {isLeft ? 'Target: ' : 'Source: '} {getDatasetName(targetId)}
                    </div>
                    <code className="text-xs bg-slate-50 dark:bg-slate-800 text-brand dark:text-brand-light px-2 py-1 rounded">
                      ON {join.join_condition}
                    </code>
                  </div>
                </div>
                <button
                  onClick={() => deleteJoinMut.mutate(join.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
