import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, CheckCircle, XCircle, Shield, User as UserIcon, RefreshCw, Trash2, Plus, X, Save, UserCheck, Pencil } from 'lucide-react';
import { userService } from '../services/userService';
import { AppUser } from '../types';

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState<AppUser>({
    name: '',
    email: '',
    role: 'Executive',
    category: 'None'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to fetch users.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSeed = async () => {
    if (!confirm("This will add all predefined users from the original list. Continue?")) return;
    setIsSeeding(true);
    setMessage(null);
    try {
      await userService.seedUsers();
      setMessage({ text: 'Predefined users initialized successfully.', type: 'success' });
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error initializing users.', type: 'error' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      setMessage({ text: 'Please fill in all fields.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingEmail) {
        await userService.updateUser(editingEmail, {
          name: newUser.name,
          role: newUser.role,
          category: newUser.category
        });
        setMessage({ text: `User ${newUser.name} updated successfully.`, type: 'success' });
      } else {
        await userService.createUser(newUser);
        setMessage({ text: `User ${newUser.name} added successfully.`, type: 'success' });
      }
      setNewUser({ name: '', email: '', role: 'Executive', category: 'None' });
      setShowAddForm(false);
      setIsEditing(false);
      setEditingEmail(null);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setMessage({ text: isEditing ? 'Failed to update user.' : 'Failed to add user.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: AppUser) => {
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      category: user.category || 'None'
    });
    setIsEditing(true);
    setEditingEmail(user.email);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewUser({ name: '', email: '', role: 'Executive', category: 'None' });
    setShowAddForm(false);
    setIsEditing(false);
    setEditingEmail(null);
  };

  const handleDeleteUser = async (email: string, name: string) => {
    if (!confirm(`Are you sure you want to remove access for ${name}?`)) return;
    
    try {
      // Assuming userService has or we'll add deleteUser. Let's use createUser with a delete logic or direct firestore if simple.
      // For now, let's stick to adding the service method in the next step or doing it here.
      // I'll add deleteUser to userService in a moment.
      await (userService as any).deleteUser(email); 
      setMessage({ text: `${name} has been removed.`, type: 'success' });
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to remove user.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Personnel Protocols</h2>
          <p className="text-slate-500 text-sm font-medium">Manage authorized stewards and system-level access hierarchies.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchUsers}
            disabled={loading}
            className="p-3 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-2xl transition-all shadow-sm group"
            title="Refresh personnel list"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (isEditing) {
                handleCancelEdit();
              } else {
                setShowAddForm(true);
              }
            }}
            className="flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-2xl font-bold transition-all text-sm shadow-lg shadow-emerald-500/10"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEditing ? 'Cancel Edit' : 'Add Steward'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-2xl font-bold transition-all text-sm shadow-sm"
          >
            {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Sync System
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                  {isEditing ? <Pencil className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900">
                    {isEditing ? `Edit User: ${newUser.name}` : 'Authorize New Steward'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {isEditing ? 'Modify access levels and user category.' : 'Grant system access to new personnel members.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCancelEdit}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors group"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Identity Name</label>
                <input 
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="e.g. John Doe"
                  className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 focus:bg-white transition-all font-semibold text-sm"
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Email</label>
                <input 
                  type="email"
                  required
                  disabled={isEditing}
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="name@gmail.com"
                  className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 focus:bg-white transition-all font-semibold text-sm disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">Access Tier</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 focus:bg-white transition-all font-semibold text-sm appearance-none cursor-pointer"
                >
                  <option value="Executive">Executive</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-blue-600 transition-colors ml-1">User Category</label>
                <select 
                  value={newUser.category}
                  onChange={(e) => setNewUser({...newUser, category: e.target.value as any})}
                  className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 focus:bg-white transition-all font-semibold text-sm appearance-none cursor-pointer"
                >
                  <option value="None">Staff / Office</option>
                  <option value="Sales Person">Sales Person</option>
                  <option value="Sales Partner">Sales Partner</option>
                  <option value="Field Supervisor">Field Supervisor</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Store Incharge">Store Incharge</option>
                  <option value="Technician">Technician</option>
                  <option value="Bank executive">Bank executive</option>
                  <option value="Project Coordinator">Project Coordinator</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto bg-zinc-900 hover:bg-zinc-800 text-white px-10 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/10 active:scale-95"
                >
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : isEditing ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {isEditing ? 'Update Authorization' : 'Deploy Authorization'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
          <span className="text-sm font-bold">{message.text}</span>
          <button 
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-40 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200/60">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Steward Profile</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credential Endpoint</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Access Hierarchy</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <RefreshCw className="w-10 h-10 animate-spin text-slate-200 mb-4" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hydrating Personnel Records...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Users className="w-16 h-16 text-slate-200 mb-4" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Active Authorizations Found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={`${user.email}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${user.category === 'Sales Person' ? 'text-blue-600' : user.category === 'Sales Partner' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {user.category || 'Staff'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-slate-500 font-medium text-sm">{user.email}</td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        user.role === 'Admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {user.role === 'Admin' ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit User"
                        >
                          <Pencil className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.email, user.name)}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Access Rule</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Only users listed here can sign in to the platform. <strong>Admins</strong> can manage this list and see all leads. <strong>Executives</strong> can only see and manage leads assigned to them or created by them.
        </p>
      </div>
    </div>
  );
}
