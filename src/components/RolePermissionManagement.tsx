import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Save, RotateCcw, Check, X, ShieldAlert, CheckSquare, Square, Lock, Info } from 'lucide-react';
import { settingsService, DEFAULT_ROLE_PERMISSIONS } from '../services/settingsService';

type Action = 'view' | 'create' | 'edit' | 'delete';
type Section = 'dashboard' | 'tasks' | 'services' | 'payments' | 'commission' | 'mis' | 'admin';

const SECTION_LABELS: Record<Section, { title: string; description: string }> = {
  dashboard: { title: 'CRM / Leads Workspace', description: 'Access to lead lists, pipelines, and detailed client portfolios.' },
  tasks: { title: 'Task Sheet Workspace', description: 'Monitor active deadlines, assignee statuses, and project milestones.' },
  services: { title: 'Service Steps Workspace', description: 'Manage and update custom solar installation services.' },
  payments: { title: 'Payments Workspace', description: 'Record client installments, bank details, and verify transaction receipts.' },
  commission: { title: 'Commission Calculations', description: 'Calculate role-based rewards, partner cuts, and payouts.' },
  mis: { title: 'MIS Reports Workspace', description: 'Generate management logs, charts, and capacity analytics.' },
  admin: { title: 'System Parameters Hub', description: 'Configure SLAs, rates, team directory, and global permissions.' }
};

export default function RolePermissionManagement() {
  const [permissions, setPermissions] = useState<Record<string, Record<string, Record<Action, boolean>>>>(DEFAULT_ROLE_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState<string>('Junior Admin');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsub = settingsService.subscribeToRolePermissions((data) => {
      if (data) {
        // Ensure all roles and sections have structured objects to avoid crashes
        const merged: any = { ...DEFAULT_ROLE_PERMISSIONS };
        Object.keys(data).forEach((role) => {
          if (!merged[role]) merged[role] = {};
          Object.keys(DEFAULT_ROLE_PERMISSIONS.Admin).forEach((sec) => {
            if (!merged[role][sec]) {
              merged[role][sec] = { view: false, create: false, edit: false, delete: false };
            }
            const secData = data[role]?.[sec] || {};
            merged[role][sec] = {
              view: typeof secData.view === 'boolean' ? secData.view : false,
              create: typeof secData.create === 'boolean' ? secData.create : false,
              edit: typeof secData.edit === 'boolean' ? secData.edit : false,
              delete: typeof secData.delete === 'boolean' ? secData.delete : false,
            };
          });
        });
        setPermissions(merged);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleToggle = (section: Section, action: Action) => {
    if (selectedRole === 'Admin') return; // Admin permissions are permanently locked to true for system integrity

    setPermissions((prev) => {
      const rolePerms = { ...prev[selectedRole] };
      const secPerms = { ...rolePerms[section] };
      
      // If turning view off, automatically disable create, edit, delete to maintain logic
      if (action === 'view' && secPerms.view === true) {
        secPerms.view = false;
        secPerms.create = false;
        secPerms.edit = false;
        secPerms.delete = false;
      } else {
        secPerms[action] = !secPerms[action];
        // If enabling any action, automatically ensure view is active
        if (secPerms[action] && action !== 'view') {
          secPerms.view = true;
        }
      }

      return {
        ...prev,
        [selectedRole]: {
          ...rolePerms,
          [section]: secPerms
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await settingsService.saveRolePermissions(permissions);
      setMessage({ text: 'Access control matrices updated successfully.', type: 'success' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to write permissions schema to Firestore.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to restore all role permissions to strict factory system defaults? This will overwrite your current configuration.')) {
      return;
    }
    
    setIsSaving(true);
    setMessage(null);
    try {
      await settingsService.saveRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setPermissions(DEFAULT_ROLE_PERMISSIONS);
      setMessage({ text: 'Restored standard system-defined defaults successfully.', type: 'success' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to reset permissions schema.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <RotateCcw className="w-8 h-8 animate-spin text-slate-400 mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling permission matrices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-8 h-8 text-indigo-600" />
            Security Matrix & Privileges
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Map granular view, edit, and deletion privileges to operational tiers without affecting live schema scopes.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-5 py-3 rounded-2xl font-bold transition-all text-xs shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-2xl font-bold transition-all text-xs shadow-lg shadow-emerald-500/10"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Matrix...' : 'Save Permissions'}
          </motion.button>
        </div>
      </div>

      {/* Info status notification message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-rose-500" />}
          <span className="text-xs font-bold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Role sidebar selectors */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Access Hierarchy</h3>
          {['Admin', 'Junior Admin', 'Executive'].map((role) => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition-all flex items-center justify-between group ${
                  isSelected 
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 shadow-sm font-bold' 
                    : 'bg-white border-slate-200/60 text-slate-600 hover:border-slate-300 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider font-extrabold">{role}</span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {role === 'Admin' ? 'Unrestricted Core Access' : role === 'Junior Admin' ? 'Configurable Hub Access' : 'Involved Client Workflow'}
                    </span>
                  </div>
                </div>
                {role === 'Admin' && <Lock className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            );
          })}

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 leading-normal space-y-2 mt-6">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>Permission Cascades</span>
            </div>
            <p>
              Turning on <strong>Create</strong>, <strong>Edit</strong>, or <strong>Delete</strong> automatically grants the <strong>View</strong> permission.
            </p>
            <p>
              Turning off <strong>View</strong> automatically revokes all other permissions for that specific tab to prevent access logic deadlocks.
            </p>
          </div>
        </div>

        {/* Permission matrix configuration panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/40 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-slate-800">
                Currently Configuring: <span className="text-indigo-600 underline uppercase tracking-wider font-black">{selectedRole}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {selectedRole === 'Admin' 
                  ? 'All permissions are permanently enforced and cannot be disabled to prevent administrator lockouts.' 
                  : 'Check or uncheck the boxes below to map structural permissions in real-time.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/3">Section Module</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">View</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Create</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Edit</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Object.keys(SECTION_LABELS) as Section[]).map((sec) => {
                    const secLabel = SECTION_LABELS[sec];
                    const isReadOnly = selectedRole === 'Admin';
                    const activePermissions = permissions[selectedRole]?.[sec] || { view: false, create: false, edit: false, delete: false };

                    return (
                      <tr key={sec} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-900">{secLabel.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium leading-normal">{secLabel.description}</span>
                          </div>
                        </td>
                        
                        {(['view', 'create', 'edit', 'delete'] as Action[]).map((action) => {
                          const isChecked = activePermissions[action] || false;
                          return (
                            <td key={action} className="px-6 py-5 text-center">
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleToggle(sec, action)}
                                className={`inline-flex items-center justify-center p-2.5 rounded-xl transition-all ${
                                  isReadOnly 
                                    ? 'cursor-not-allowed opacity-80' 
                                    : 'hover:bg-slate-100/80 cursor-pointer active:scale-95'
                                }`}
                              >
                                {isChecked ? (
                                  <div className={`p-1 rounded-lg ${isReadOnly ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'}`}>
                                    <Check className="w-4 h-4 stroke-[3px]" />
                                  </div>
                                ) : (
                                  <div className="p-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-300">
                                    <div className="w-4 h-4" />
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
