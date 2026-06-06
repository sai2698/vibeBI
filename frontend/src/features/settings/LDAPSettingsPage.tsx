import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Shield, Server, User, Save, AlertCircle, Loader2, CheckCircle2, Info } from 'lucide-react';
import api from '../../api';

interface LDAPConfig {
  is_enabled: boolean;
  server_uri: string;
  bind_dn: string;
  bind_password?: string;
  base_dn: string;
  user_search_base: string;
  user_object_class: string;
  user_id_attribute: string;
  user_email_attribute: string;
  user_name_attribute: string;
  group_search_base: string;
}

const LDAPSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Partial<LDAPConfig>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['ldap-config'],
    queryFn: async () => {
      const res = await api.get('/api/settings/ldap');
      return res.data;
    },
    refetchOnWindowFocus: false, // Prevent losing unsaved changes on tab switch
  });

  React.useEffect(() => {
    if (data) {
      setConfig(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (data: Partial<LDAPConfig>) => api.patch('/api/settings/ldap', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ldap-config'] });
      toast.success('LDAP settings updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update settings');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Shield size={24} className="text-brand" /> LDAP Configuration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure enterprise directory integration and user synchronization</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${config.is_enabled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {config.is_enabled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {config.is_enabled ? 'Active' : 'Disabled'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle Card */}
        <div className="card !p-6 transition-all hover:shadow-md dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enable LDAP Authentication</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Allow users to log in using enterprise credentials</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={config.is_enabled}
                onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
              />
              <div className="w-12 h-7 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand"></div>
            </label>
          </div>
        </div>

        {config.is_enabled && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Server Connection */}
            <div className="card !p-6 space-y-6 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <Server className="text-brand" size={18} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Server Configuration</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Server URI</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                    placeholder="ldap://ldap.company.com:389"
                    value={config.server_uri || ''}
                    onChange={(e) => setConfig({ ...config, server_uri: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Bind DN</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                    placeholder="cn=admin,dc=company,dc=com"
                    value={config.bind_dn || ''}
                    onChange={(e) => setConfig({ ...config, bind_dn: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Bind Password</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                    placeholder="••••••••••••"
                    value={config.bind_password || ''}
                    onChange={(e) => setConfig({ ...config, bind_password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* User Mapping */}
            <div className="card !p-6 space-y-6 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <User className="text-brand" size={18} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">User Schema & Search</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">User Search Base</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                    placeholder="ou=people,dc=company,dc=com"
                    value={config.user_search_base || ''}
                    onChange={(e) => setConfig({ ...config, user_search_base: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Attr</label>
                    <input 
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                      placeholder="mail"
                      value={config.user_email_attribute || ''}
                      onChange={(e) => setConfig({ ...config, user_email_attribute: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Name Attr</label>
                    <input 
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                      placeholder="cn"
                      value={config.user_name_attribute || ''}
                      onChange={(e) => setConfig({ ...config, user_name_attribute: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">User ID Attribute</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-xs dark:text-slate-100"
                    placeholder="uid or sAMAccountName"
                    value={config.user_id_attribute || ''}
                    onChange={(e) => setConfig({ ...config, user_id_attribute: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-6">
          <button 
            type="button" 
            className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={mutation.isPending}
            className="px-8 py-2.5 bg-brand text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand/20 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      <div className="mt-8 p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl flex gap-4">
        <div className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5">
          <Info size={20} />
        </div>
        <div className="space-y-1 text-left">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">About Dual Authentication</h4>
          <p className="text-xs text-blue-800 dark:text-blue-200/70 leading-relaxed font-medium">
            When LDAP is enabled, the system will first attempt to authenticate users against the local database. If no local user is found or authentication fails, it will attempt to verify credentials against your LDAP server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LDAPSettingsPage;
