import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  Pencil, 
  RefreshCw,
  Coins,
  ShieldCheck,
  Check,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { commissionService } from '../services/commissionService';
import { userService } from '../services/userService';
import { CommissionRole, AppUser } from '../types';

export default function CommissionRolesManager() {
  const [roles, setRoles] = useState<CommissionRole[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track in-flight additions to prevent duplicates/race conditions
  const inFlightAdds = useRef<Set<string>>(new Set());
  const inFlightDeletes = useRef<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState<Omit<CommissionRole, 'id' | 'createdAt'>>({
    name: '',
    role: 'Lead Creator',
    ratePerKw: 0,
    rateType: 'percentage',
    rateValue: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto clear alerts
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Cleanup duplicates from DB if any exist (e.g. from previous runs)
  useEffect(() => {
    if (roles.length === 0) return;

    const cleanupDuplicates = async () => {
      const seenNames = new Set<string>();
      const duplicatesToDelete: CommissionRole[] = [];

      for (const role of roles) {
        if (!role.id || !role.name) continue;
        const normalized = role.name.toLowerCase().trim();
        if (seenNames.has(normalized)) {
          duplicatesToDelete.push(role);
        } else {
          seenNames.add(normalized);
        }
      }

      for (const dup of duplicatesToDelete) {
        if (dup.id && !inFlightDeletes.current.has(dup.id)) {
          inFlightDeletes.current.add(dup.id);
          try {
            console.log(`Auto-deleting duplicate commission role for: ${dup.name} (ID: ${dup.id})`);
            await commissionService.deleteCommissionRole(dup.id);
          } catch (e) {
            console.error("Error auto-deleting duplicate role:", e);
            inFlightDeletes.current.delete(dup.id);
          }
        }
      }
    };

    cleanupDuplicates();
  }, [roles]);

  // Subscribe to Firestore collections
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to commission roles
    const unsubRoles = commissionService.subscribeToCommissionRoles((fetchedRoles) => {
      setRoles(fetchedRoles);
      setLoading(false);
    });

    // Subscribe to user directory
    const unsubUsers = userService.subscribeToUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
    });

    return () => {
      unsubRoles();
      unsubUsers();
    };
  }, []);

  // Manual one-time sync logic to import all employee names from User & Team Directory just once
  const handleManualSync = async () => {
    if (users.length === 0) {
      setMessage({ text: 'No users found in the directory to import.', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setMessage(null);
    let addedCount = 0;

    try {
      const existingNames = new Set(roles.map(r => r.name.toLowerCase().trim()));

      for (const user of users) {
        if (!user.name) continue;
        const normalizedUserName = user.name.toLowerCase().trim();

        if (existingNames.has(normalizedUserName)) {
          continue;
        }

        // Add to db
        if (user.category === 'Sales Person') {
          await commissionService.addCommissionRole({
            name: user.name,
            role: 'Sales Person',
            rateType: 'percentage',
            rateValue: 0,
            ratePerKw: null as any
          });
        } else if (user.category === 'Sales Partner') {
          await commissionService.addCommissionRole({
            name: user.name,
            role: 'Sales Partner',
            rateType: 'percentage',
            rateValue: 0,
            ratePerKw: null as any
          });
        } else {
          await commissionService.addCommissionRole({
            name: user.name,
            role: 'Lead Creator',
            ratePerKw: 0,
            rateType: null as any,
            rateValue: null as any
          });
        }

        // Keep track locally in the loop to avoid adding the same name twice in the same sync session
        existingNames.add(normalizedUserName);
        addedCount++;
      }

      if (addedCount > 0) {
        setMessage({ 
          text: `Successfully imported ${addedCount} employee(s) from directory.`, 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: 'All employees are already registered under commission roles.', 
          type: 'success' 
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to import from User Directory.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ text: 'Please fill in the person\'s name.', type: 'error' });
      return;
    }

    // Check for duplicate names (Duplicate name not allowed across roles)
    const normalizedNameInput = formData.name.trim().toLowerCase();
    const isDuplicate = roles.some(
      r => r.name.toLowerCase().trim() === normalizedNameInput && r.id !== editingId
    );

    if (isDuplicate) {
      setMessage({ text: 'Duplicate name not allowed', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const savePayload: any = {
        name: formData.name.trim(),
        role: formData.role
      };

      if (formData.role === 'Lead Creator') {
        savePayload.ratePerKw = Number(formData.ratePerKw || 0);
        savePayload.rateType = null;
        savePayload.rateValue = null;
      } else {
        savePayload.ratePerKw = null;
        savePayload.rateType = formData.rateType || 'percentage';
        savePayload.rateValue = Number(formData.rateValue || 0);
      }

      if (editingId) {
        await commissionService.updateCommissionRole(editingId, savePayload);
        setMessage({ text: 'Commission role updated successfully.', type: 'success' });
      } else {
        await commissionService.addCommissionRole(savePayload);
        setMessage({ text: 'New commission role added successfully.', type: 'success' });
      }
      
      // Reset form
      setFormData({ name: '', role: 'Lead Creator', ratePerKw: 0, rateType: 'percentage', rateValue: 0 });
      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'Failed to save commission role.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: CommissionRole) => {
    setFormData({
      name: item.name,
      role: item.role,
      ratePerKw: item.ratePerKw || 0,
      rateType: item.rateType || 'percentage',
      rateValue: item.rateValue || 0
    });
    setEditingId(item.id || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from commission roles?`)) return;

    try {
      await commissionService.deleteCommissionRole(id);
      setMessage({ text: `${name} has been removed successfully.`, type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to delete commission role.', type: 'error' });
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', role: 'Lead Creator', ratePerKw: 0, rateType: 'percentage', rateValue: 0 });
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Upper header action block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Commission Roles</h2>
          <p className="text-slate-500 text-sm font-medium">Pre-define team members and partners who qualify for commission distribution profiles.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-indigo-600 border border-slate-200 px-6 py-3 rounded-2xl font-bold transition-all text-sm shadow-sm"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Import from Directory</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (showForm && editingId) {
                handleCancel();
              } else {
                setShowForm(!showForm);
              }
            }}
            className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold transition-all text-sm shadow-md"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel Form' : 'Add New Entry'}
          </motion.button>
        </div>
      </div>

      {/* Notifications/Alert banners */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 border ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-xs font-bold">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Form Drawer */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">
                    {editingId ? 'Edit Commission Role Profile' : 'Configure New Commission Role'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingId ? 'Modify name and specific classification profile.' : 'Establish commission-eligible credentials.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCancel}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors group"
              >
                <X className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
              </button>
            </div>

            <form onSubmit={handleAddOrUpdate} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Person's Name</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Hemant Tyagi"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commission Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm cursor-pointer"
                  >
                    <option value="Lead Creator">Lead Creator</option>
                    <option value="Sales Person">Sales Person</option>
                    <option value="Sales Partner">Sales Partner</option>
                  </select>
                </div>
              </div>

              {/* Conditional Rate Configuration UI */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                  Commission Rate Configuration
                </h4>
                
                {formData.role === 'Lead Creator' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate per kW (₹)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-slate-400 font-bold text-sm">₹</span>
                        <input 
                          type="number"
                          required
                          min="0"
                          value={formData.ratePerKw || ''}
                          onChange={(e) => setFormData({ ...formData, ratePerKw: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 100"
                          className="w-full pl-9 pr-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 transition-all font-semibold text-sm"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 pb-3 leading-relaxed">
                      Lead creators receive a flat commission rate multiplied by the final capacity (kW) of the project.
                      <br />
                      <span className="font-semibold text-indigo-600">Formula: Commission = System kW × ₹ Rate</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate Basis</label>
                      <select
                        value={formData.rateType || 'percentage'}
                        onChange={(e) => setFormData({ ...formData, rateType: e.target.value as 'percentage' | 'flat' })}
                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 transition-all font-semibold text-sm cursor-pointer"
                      >
                        <option value="percentage">% of Base Rate (from Survey)</option>
                        <option value="flat">Fixed Flat Amount (₹)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {formData.rateType === 'percentage' ? 'Commission Rate (%)' : 'Flat Amount (₹)'}
                      </label>
                      <div className="relative flex items-center">
                        {formData.rateType === 'flat' && <span className="absolute left-4 text-slate-400 font-bold text-sm">₹</span>}
                        <input 
                          type="number"
                          required
                          min="0"
                          max={formData.rateType === 'percentage' ? 100 : undefined}
                          step={formData.rateType === 'percentage' ? 0.01 : 1}
                          value={formData.rateValue || ''}
                          onChange={(e) => setFormData({ ...formData, rateValue: parseFloat(e.target.value) || 0 })}
                          placeholder={formData.rateType === 'percentage' ? 'e.g. 5' : 'e.g. 10000'}
                          className={`w-full ${formData.rateType === 'flat' ? 'pl-9' : 'pl-5'} ${formData.rateType === 'percentage' ? 'pr-9' : 'pr-5'} py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 transition-all font-semibold text-sm`}
                        />
                        {formData.rateType === 'percentage' && <span className="absolute right-4 text-slate-400 font-bold text-sm">%</span>}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 pb-3 leading-relaxed">
                      {formData.rateType === 'percentage' ? (
                        <span>
                          Commission calculated as a percentage of the project's <strong className="text-slate-700">Base Rate</strong>.
                          <br />
                          <span className="font-semibold text-indigo-600">Formula: Base Rate × Rate %</span>
                        </span>
                      ) : (
                        <span>
                          Commission will be a custom fixed cash incentive irrespective of project dimensions.
                          <br />
                          <span className="font-semibold text-indigo-600">Formula: Commission = Flat Amount</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 px-6 rounded-xl font-bold transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white py-3.5 px-8 rounded-xl font-bold transition-all text-sm shadow-md"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingId ? 'Update Entry' : 'Save Entry'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roles Master Directory Table */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Commission Role Assignments</h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
              User Directory Integrated
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
            {roles.length} {roles.length === 1 ? 'Profile' : 'Profiles'} Listed
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-bold">Synchronizing profiles with cloud registries...</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Commission Roles Configured</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold mt-1">
              Add users, agents, or external lead creators to pre-define their commission relationships.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6 font-black">Name</th>
                  <th className="py-4 px-6 font-black">Commission Role Type</th>
                  <th className="py-4 px-6 font-black">Configured Commission Rate</th>
                  <th className="py-4 px-6 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-600">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold rounded-lg ${
                        item.role === 'Lead Creator'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : item.role === 'Sales Person'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        <Check className="w-3 h-3 shrink-0" />
                        {item.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-semibold text-slate-700">
                        {item.role === 'Lead Creator' ? (
                          <span>₹{(item.ratePerKw || 0).toLocaleString()} <span className="text-slate-400 font-medium">per kW</span></span>
                        ) : item.rateType === 'flat' ? (
                          <span>₹{(item.rateValue || 0).toLocaleString()} <span className="text-slate-400 font-medium">flat amount</span></span>
                        ) : (
                          <span>{(item.rateValue || 0)}% <span className="text-slate-400 font-medium">of Base Rate</span></span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-xl transition-all"
                          title="Edit role mapping"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => item.id && handleDelete(item.id, item.name)}
                          className="p-2 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all"
                          title="Delete mapping profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
