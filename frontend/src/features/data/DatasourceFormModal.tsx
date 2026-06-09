import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Database, HardDrive, Settings, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../api';

interface Datasource {
  id: number;
  name: string;
  engine: string;
  connection_uri: string;
  advanced_properties?: {
    impersonate_user?: boolean;
    [key: string]: any;
  };
}

interface DatasourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDatasource?: Datasource | null;
}

type EngineType = 'postgres' | 'mysql' | 'sqlite' | 'oracle' | 'custom' | 'starrocks' | 'trino' | 'presto' | 'hive' | 'spark';

const engineOptions = [
  { id: 'postgres', name: 'PostgreSQL', icon: <Database className="text-blue-500" size={32} /> },
  { id: 'mysql', name: 'MySQL', icon: <Database className="text-orange-500" size={32} /> },
  { id: 'oracle', name: 'Oracle DB', icon: <Database className="text-red-600" size={32} /> },
  { id: 'starrocks', name: 'StarRocks', icon: <Database className="text-teal-500" size={32} /> },
  { id: 'trino', name: 'Trino', icon: <Database className="text-pink-600" size={32} /> },
  { id: 'presto', name: 'Presto', icon: <Database className="text-blue-400" size={32} /> },
  { id: 'hive', name: 'Apache Hive', icon: <Database className="text-yellow-600" size={32} /> },
  { id: 'spark', name: 'Spark SQL', icon: <Database className="text-orange-600" size={32} /> },
  { id: 'sqlite', name: 'SQLite', icon: <HardDrive className="text-slate-500" size={32} /> },
  { id: 'custom', name: 'Custom URI', icon: <Settings className="text-slate-600" size={32} /> },
];

export const DatasourceFormModal: React.FC<DatasourceFormModalProps> = ({ isOpen, onClose, editingDatasource }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEngine, setSelectedEngine] = useState<EngineType | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { register, handleSubmit, watch, reset, setValue } = useForm();
  const queryClient = useQueryClient();

  // Handle editing initialization
  React.useEffect(() => {
    if (editingDatasource && isOpen) {
      setSelectedEngine(editingDatasource.engine.toLowerCase() as EngineType);
      setStep(2);
      setValue('name', editingDatasource.name);
      if (editingDatasource.advanced_properties?.impersonate_user) {
        setValue('impersonate_user', true);
      }
      
      if (editingDatasource.engine.toLowerCase() === 'custom') {
        setValue('custom_uri', editingDatasource.connection_uri);
      } else if (editingDatasource.engine.toLowerCase() === 'sqlite') {
        const path = editingDatasource.connection_uri.replace('sqlite+aiosqlite:///', '');
        setValue('filepath', path);
      } else {
        // Complex parsing for postgres/mysql URIs
        try {
          const uri = editingDatasource.connection_uri;
          // driver://user:pass@host:port/db
          const regex = /:\/\/([^:]+):?([^@]+)?@([^:]+):?(\d+)?\/(.+)/;
          const match = uri.match(regex);
          if (match) {
            setValue('username', match[1]);
            setValue('password', match[2] ? decodeURIComponent(match[2]) : '');
            setValue('host', match[3]);
            
            let defaultPort = '5432';
            if (editingDatasource.engine.toLowerCase() === 'mysql') defaultPort = '3306';
            else if (editingDatasource.engine.toLowerCase() === 'starrocks') defaultPort = '9030';
            else if (editingDatasource.engine.toLowerCase() === 'oracle') defaultPort = '1521';
            else if (editingDatasource.engine.toLowerCase() === 'trino') defaultPort = '8080';
            else if (editingDatasource.engine.toLowerCase() === 'presto') defaultPort = '8080';
            else if (editingDatasource.engine.toLowerCase() === 'hive' || editingDatasource.engine.toLowerCase() === 'spark') defaultPort = '10000';
            
            setValue('port', match[4] || defaultPort);
            setValue('database', match[5]);
          }
        } catch (e) {
          // Fallback to custom URI if parsing fails
          setSelectedEngine('custom');
          setValue('custom_uri', editingDatasource.connection_uri);
        }
      }
    }
  }, [editingDatasource, isOpen, setValue]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/api/datasources/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      toast.success('Connection created successfully');
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create connection')
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number, payload: any }) => {
      return await api.patch(`/api/datasources/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      toast.success('Connection updated');
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update connection')
  });

  const testMutation = useMutation({
    mutationFn: async (data: { engine: string, connection_uri: string, advanced_properties?: any }) => {
      return await api.post('/api/datasources/test', data);
    },
    onSuccess: (response) => {
      setTestResult(response.data);
      if (response.data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed');
      }
    },
    onError: (error: any) => {
      setTestResult({ success: false, message: error.response?.data?.detail || error.message });
      toast.error('Connection test failed');
    }
  });

  const handleClose = () => {
    reset();
    setStep(1);
    setSelectedEngine(null);
    setTestResult(null);
    onClose();
  };

  const constructUri = (data: any, engine: EngineType) => {
    if (engine === 'custom') return data.custom_uri;
    if (engine === 'sqlite') return `sqlite+aiosqlite:///${data.filepath}`;
    
    // For postgres, mysql and oracle
    let driver = '';
    let suffix = '';
    
    if (engine === 'postgres') {
      driver = 'postgresql+asyncpg';
    } else if (engine === 'mysql') {
      driver = 'mysql+aiomysql';
    } else if (engine === 'starrocks') {
      driver = 'starrocks+asyncmy';
    } else if (engine === 'oracle') {
      driver = 'oracle+oracledb';
      suffix = `/?service_name=${data.database}`;
    } else if (engine === 'trino') {
      driver = 'trino';
    } else if (engine === 'presto') {
      driver = 'presto';
    } else if (engine === 'hive' || engine === 'spark') {
      driver = 'hive';
    }
    
    const auth = data.password ? `${data.username}:${encodeURIComponent(data.password)}` : (data.username || '');
    const credentials = auth ? `${auth}@` : '';
    const base = `${driver}://${credentials}${data.host}:${data.port}`;
    return engine === 'oracle' ? `${base}${suffix}` : `${base}/${data.database}`;
  };

  const onSubmit = (data: any) => {
    if (!selectedEngine) return;
    const connection_uri = constructUri(data, selectedEngine);
    const advanced_properties = {
      impersonate_user: data.impersonate_user || false
    };
    const payload = {
      name: data.name,
      engine: selectedEngine,
      connection_uri,
      advanced_properties
    };

    if (editingDatasource) {
      updateMutation.mutate({ id: editingDatasource.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleTestConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedEngine) return;
    const data = watch();
    // basic validation before testing
    if (!data.name) return;
    const connection_uri = constructUri(data, selectedEngine);
    testMutation.mutate({ engine: selectedEngine, connection_uri, advanced_properties: { impersonate_user: data.impersonate_user || false } });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">
            {step === 1 ? 'Select Database Engine' : (editingDatasource ? `Edit ${editingDatasource.name}` : `Configure ${engineOptions.find(e => e.id === selectedEngine)?.name}`)}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {engineOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedEngine(opt.id as EngineType);
                    setStep(2);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-slate-100 rounded-xl hover:border-brand hover:bg-brand/5 transition group"
                >
                  <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-white transition shadow-sm">
                    {opt.icon}
                  </div>
                  <span className="font-medium text-slate-700">{opt.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && selectedEngine && (
            <form id="datasource-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input
                  {...register('name', { required: true })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Production Sales DB"
                />
              </div>

              {selectedEngine === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SQLAlchemy URI</label>
                  <input
                    {...register('custom_uri', { required: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                    placeholder="postgresql+asyncpg://user:pass@host:port/dbname"
                  />
                  <p className="text-xs text-slate-500 mt-1">Make sure to use an async driver (e.g. asyncpg, aiomysql)</p>
                </div>
              )}

              {selectedEngine === 'sqlite' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">File Path</label>
                  <input
                    {...register('filepath', { required: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                    placeholder="/absolute/path/to/database.sqlite"
                  />
                </div>
              )}

              {(selectedEngine !== 'custom' && selectedEngine !== 'sqlite') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                    <input
                      {...register('host', { required: true })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                      placeholder="localhost"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                    <input
                      {...register('port', { required: true })}
                      type="number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                      placeholder="e.g. 5432"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Database / Service Name</label>
                    <input
                      {...register('database', { required: true })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                      placeholder={selectedEngine === 'oracle' ? "xe" : "postgres"}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username {(['trino', 'presto', 'hive', 'spark'].includes(selectedEngine) && ' (Optional)')}</label>
                    <input
                      {...register('username', { required: !['trino', 'presto', 'hive', 'spark'].includes(selectedEngine) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                      placeholder="admin"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      {...register('password')}
                      type="password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* Advanced Properties Section */}
              <div className="pt-4 mt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Settings size={16} className="text-slate-500" />
                  Advanced Settings
                </h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        {...register('impersonate_user')}
                        className="w-4 h-4 text-brand bg-slate-100 border-slate-300 rounded focus:ring-brand focus:ring-2"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">Enable User Impersonation</span>
                      <span className="text-xs text-slate-500">
                        When executing queries, connect to the database using the logged-in user's identity instead of the service account.
                        Supported on Trino, Presto, Hive, Spark SQL, and StarRocks.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg flex items-start gap-2 ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResult.success ? <CheckCircle2 size={20} className="text-green-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          {step === 2 ? (
            <>
              <button 
                type="button" 
                onClick={() => { setStep(1); setTestResult(null); }}
                className="btn-ghost"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                >
                  {testMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  Test Connection
                </button>
                <button 
                  type="submit" 
                  form="datasource-form"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingDatasource ? 'Save Changes' : 'Connect'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <button type="button" onClick={handleClose} className="btn-ghost">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
