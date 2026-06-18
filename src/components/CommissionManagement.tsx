import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Users, 
  User as UserIcon, 
  Trash2, 
  Plus, 
  DollarSign, 
  PieChart, 
  ArrowRight,
  TrendingUp,
  Info,
  Pencil,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronRight,
  TrendingDown,
  History
} from 'lucide-react';
import { commissionService } from '../services/commissionService';
import { leadService } from '../services/leadService';
import { userService } from '../services/userService';
import { CommissionRecord, Lead, AppUser } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CommissionManagementProps {
  userEmail: string;
  isAdmin: boolean;
}

export const CommissionManagement: React.FC<CommissionManagementProps> = ({ userEmail, isAdmin }) => {
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [category, setCategory] = useState<'Sales Partner' | 'Sales Person'>('Sales Partner');
  
  // Form State
  const [name, setName] = useState('');
  const [kw, setKw] = useState('3.1 kW');
  const [mrp, setMrp] = useState(190000);
  const [soldAt, setSoldAt] = useState(190000);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<CommissionRecord | null>(null);
  
  // Real-time calculation state
  const [calcResult, setCalcResult] = useState<{ salesman: number; company: number; remark: string }>({ salesman: 0, company: 0, remark: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubCommissions = commissionService.subscribeToCommissions(setCommissions);
    const unsubLeads = leadService.subscribeToLeads(isAdmin ? 'Admin' : 'Executive', userEmail, setLeads);
    const unsubUsers = userService.subscribeToUsers(setUsers);
    
    return () => {
      unsubCommissions();
      unsubLeads();
      unsubUsers();
    };
  }, [isAdmin, userEmail]);

  // Find leads that are marked as Completed and don't yet have a commission record
  // Also filter by the currently selected category
  const pendingLeads = useMemo(() => {
    return leads.filter(lead => {
      const isCompleted = lead.status === 'Completed';
      if (!isCompleted) return false;
      
      // Check if there is already a commission record for this lead
      const hasRecord = commissions.some(c => c.leadId === lead.id);
      if (hasRecord) return false;

      // Filter by current active category
      const surveyEmail = (lead.visitedByEmail || '').toLowerCase().trim();
      const salesEmail = (lead.assignedSalesEmail || '').toLowerCase().trim();
      const targetEmail = surveyEmail || salesEmail;

      if (targetEmail) {
        const targetUser = users.find(u => u.email.toLowerCase().trim() === targetEmail);
        return targetUser?.category === category;
      }
      
      return false;
    });
  }, [leads, commissions, users, category]);

  const handleLoadLead = (lead: Lead) => {
    if (lead.status !== 'Completed') {
      alert(`Commission calculation/entry is only allowed after the lead is marked as 'Completed'. (Current status: ${lead.status || 'N/A'})`);
      return;
    }
    setSelectedLeadId(lead.id);
    setName(lead.customerName);
    setKw(lead.finalKw || lead.requiredKw || 'N/A');
    setSoldAt(lead.finalRate || 0);
    setMrp(lead.originalRate || 0);
    
    // Determine the person who should get commission
    // 1. Check who did the survey first (as per user request "check side survey done by sales partner or sales person")
    // 2. Fallback to assigned sales email
    const surveyEmail = (lead.visitedByEmail || '').toLowerCase().trim();
    const salesEmail = (lead.assignedSalesEmail || '').toLowerCase().trim();
    
    const targetEmail = surveyEmail || salesEmail;

    if (targetEmail) {
      const targetUser = users.find(u => u.email.toLowerCase().trim() === targetEmail);
      if (targetUser?.category === 'Sales Person' || targetUser?.category === 'Sales Partner') {
        setCategory(targetUser.category);
        // Set the name to the user's name for calculation
        setName(targetUser.name);
        
        // Add customer info to remark if not already there
        const customerInfo = `Customer: ${lead.customerName} (${lead.leadId})`;
        if (!calcResult.remark.includes(customerInfo)) {
          setCalcResult(prev => ({
            ...prev,
            remark: `${prev.remark} | ${customerInfo}`
          }));
        }
      } else {
        // If not found in users list OR category not set, keep defaults but try to warn or just use targetEmail
        console.log("Recipient category not defined for:", targetEmail);
      }
    }
    
    setShowCalculator(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (category === 'Sales Partner') {
      const salesman = soldAt * 0.05;
      const company = soldAt - salesman;
      setCalcResult({ 
        salesman, 
        company, 
        remark: 'Flat 5% Commission for Sales Partner' 
      });
    } else {
      const floorPrice = mrp * 0.96;
      const price97 = mrp * 0.97;
      
      let salesman = 0;
      let remark = '';
      
      if (soldAt <= floorPrice) {
        salesman = 0;
        remark = "Floor — No incentive";
      } else if (soldAt <= price97) {
        salesman = soldAt - floorPrice;
        remark = "100% surplus to salesman (96% to 97% bracket)";
      } else {
        const fixedSurplusAt97 = price97 - floorPrice;
        const incrementalSurplus = soldAt - price97;
        const salesmanIncremental = incrementalSurplus * 0.30;
        salesman = fixedSurplusAt97 + salesmanIncremental;
        remark = `₹${fixedSurplusAt97.toLocaleString()} fixed + 30% of incremental surplus above 97%`;
      }
      
      setCalcResult({ 
        salesman, 
        company: soldAt - salesman, 
        remark 
      });
    }
  }, [category, mrp, soldAt]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedLeadId) {
        const targetLead = leads.find(l => l.id === selectedLeadId);
        if (!targetLead) {
          alert("The associated lead could not be found.");
          return;
        }
        if (targetLead.status !== 'Completed') {
          alert(`Commission entry or calculation is not allowed. The associated lead is not marked as 'Completed' (current status: ${targetLead.status}).`);
          return;
        }
      }
      if (editingId) {
        await commissionService.updateCommissionRecord(editingId, {
          category,
          name,
          kw,
          mrp: category === 'Sales Person' ? mrp : 0,
          soldAt,
          commissionAmount: calcResult.salesman,
          companyShare: calcResult.company,
          remark: calcResult.remark,
          leadId: selectedLeadId || undefined
        });
        setEditingId(null);
      } else {
        await commissionService.addCommissionRecord({
          category,
          name,
          kw,
          mrp: category === 'Sales Person' ? mrp : 0,
          soldAt,
          commissionAmount: calcResult.salesman,
          companyShare: calcResult.company,
          remark: calcResult.remark,
          leadId: selectedLeadId || undefined
        });
      }
      setName('');
      setSelectedLeadId(null);
      setShowCalculator(false);
      // Keep other defaults
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (rec: CommissionRecord) => {
    if (rec.leadId) {
      const targetLead = leads.find(l => l.id === rec.leadId);
      if (targetLead && targetLead.status !== 'Completed') {
        alert(`Calculations or editing is restricted because the linked lead is not marked as 'Completed' (current status: ${targetLead.status}).`);
        return;
      }
    }
    setEditingId(rec.id);
    setName(rec.name);
    setKw(rec.kw);
    setSoldAt(rec.soldAt);
    if (rec.category === 'Sales Person') {
      setMrp(rec.mrp);
    }
    setCategory(rec.category);
    // Calculations will be updated by useEffect
    setShowCalculator(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setShowCalculator(false);
    setSelectedLeadId(null);
    // reset to defaults if needed
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this record?")) {
      await commissionService.deleteCommissionRecord(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending Completed Payouts Area */}
      {pendingLeads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Completed Leads Awaiting Payout ({pendingLeads.length})</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {pendingLeads.map(lead => (
              <motion.button
                layoutId={lead.id}
                key={lead.id}
                onClick={() => handleLoadLead(lead)}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-shrink-0 w-64 p-5 bg-white border ${selectedLeadId === lead.id ? 'border-amber-500 ring-2 ring-amber-100' : 'border-amber-100'} rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-amber-100/50 transition-all text-left group relative overflow-hidden`}
              >
                {selectedLeadId === lead.id ? (
                  <div className="absolute top-0 right-0 p-3 bg-emerald-500 rounded-bl-[1.5rem] text-white">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 p-3 bg-amber-50 rounded-bl-[1.5rem] text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter mb-1">Lead ID: {lead.leadId}</p>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">{lead.customerName}</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400">Sold Price</span>
                      <span className="text-xs font-black text-slate-900">₹{lead.finalRate?.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-slate-400">Capacity</span>
                      <span className="text-xs font-black text-slate-900">{lead.finalKw || lead.requiredKw}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Calculate Now</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-all" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Header & Category Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-900 rounded-xl text-white">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Commission Ledger</h2>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1">Track and manage payout records</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto overflow-hidden">
          <button 
            onClick={() => setCategory('Sales Partner')}
            className={`flex-1 md:w-40 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${category === 'Sales Partner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users className="w-3.5 h-3.5" /> Sales Partner
          </button>
          <button 
            onClick={() => setCategory('Sales Person')}
            className={`flex-1 md:w-40 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${category === 'Sales Person' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <UserIcon className="w-3.5 h-3.5" /> Sales Person
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 relative">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-zinc-900 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-zinc-900/20">
                    {category === 'Sales Partner' ? <Users className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-none">
                      {editingId ? 'Edit Record' : 'Calculator'}
                    </h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                      {editingId ? 'Updating Entry' : 'Enter Sales Details'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCancelEdit}
                  className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                {selectedLeadId && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl mb-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Linked to Lead Data</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedLeadId(null);
                        setName('');
                      }}
                      className="p-1 hover:bg-white rounded transition-colors"
                      title="Clear link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {editingId && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-600 rounded-xl mb-6">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Editing Mode Active</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-white rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={category === 'Sales Partner' ? "Partner Name" : "Sales Person Name"}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-display"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacity (kW)</label>
                    <input 
                      type="text" 
                      value={kw}
                      onChange={(e) => setKw(e.target.value)}
                      placeholder="e.g. 3.1 kW"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-display"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sold Price (Rate)</label>
                    <input 
                      type="number" 
                      value={soldAt}
                      onChange={(e) => setSoldAt(Number(e.target.value))}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-display"
                      required
                    />
                  </div>

                  {category === 'Sales Person' && (
                    <div className="space-y-2 col-span-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product MRP (100%)</label>
                      <input 
                        type="number" 
                        value={mrp}
                        onChange={(e) => setMrp(Number(e.target.value))}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-display"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-6 text-slate-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Calculation Breakdown</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Commission Earned</span>
                      <p className="text-3xl font-black text-slate-900">₹{calcResult.salesman.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Company Profit</span>
                      <p className="text-3xl font-black text-blue-600">₹{calcResult.company.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-500 italic">“{calcResult.remark}”</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {editingId && (
                    <button 
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    type="submit"
                    className={`flex-[2] py-5 ${editingId ? 'bg-emerald-600 shadow-emerald-100' : 'bg-blue-600 shadow-blue-200'} text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2`}
                  >
                    {editingId ? <ArrowRight className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'Update Record' : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Recent Records</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Filtered by category</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <PieChart className="w-5 h-5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="pl-12 pr-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Commission</th>
                <th className="pl-4 pr-12 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {commissions.filter(c => c.category === category).map((comp) => (
                      <motion.tr 
                        key={comp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="pl-12 pr-4 py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${category === 'Sales Partner' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                              {category === 'Sales Partner' ? <Users className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="text-sm font-bold text-slate-800 truncate">{comp.name}</span>
                               <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                 {new Date(comp.date?.toDate?.() || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                               </span>
                               {comp.leadId && (
                                 <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black w-fit mt-1">
                                   Lead Linked
                                 </span>
                               )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                           <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs font-black text-slate-900">₹{comp.soldAt.toLocaleString()}</span>
                               <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase leading-none">{comp.kw}</span>
                             </div>
                             {comp.leadId && (() => {
                               const linkedLead = leads.find(l => l.id === comp.leadId);
                               return (
                                 <div className="flex flex-col mb-1 pb-1 border-b border-slate-50">
                                   <span className="text-[10px] font-bold text-blue-600 truncate">
                                     For: {linkedLead?.customerName || 'Lead Data'}
                                   </span>
                                 </div>
                               );
                             })()}
                             <p className="text-[9px] font-bold text-slate-400 leading-tight italic truncate max-w-[140px]" title={comp.remark}>
                               {comp.remark}
                             </p>
                           </div>
                        </td>
                        <td className="px-4 py-6 text-right">
                           <div className="flex flex-col items-end">
                             <span className="text-sm font-black text-emerald-600">₹{comp.commissionAmount.toLocaleString()}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">To Recipient</span>
                           </div>
                        </td>
                        <td className="pl-4 pr-12 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setViewingRecord(comp)}
                              className="p-2.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => handleEdit(comp)}
                                  className="p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-95 group-hover:bg-slate-100"
                                  title="Edit Record"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(comp.id)}
                                  className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95 group-hover:bg-slate-100"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {commissions.filter(c => c.category === category).length === 0 && (
                <div className="py-24 text-center">
                  <div className="bg-slate-50 w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <DollarSign className="w-8 h-8 text-slate-200" />
                  </div>
                  <h4 className="text-slate-900 font-black tracking-tight">No Records Found</h4>
                  <p className="text-slate-400 font-bold text-xs">Calculated commissions will appear here</p>
                </div>
              )}
            </div>
            
            {/* Summary Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-8">
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Payout</span>
                 <p className="text-xl font-black text-slate-900">
                   ₹{commissions.filter(c => c.category === category).reduce((acc, c) => acc + c.commissionAmount, 0).toLocaleString()}
                 </p>
               </div>
               <div className="space-y-1 text-right">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Records Count</span>
                 <p className="text-xl font-black text-slate-900">{commissions.filter(c => c.category === category).length}</p>
               </div>
            </div>
          </div>

          {/* Details Modal */}
      <AnimatePresence>
        {viewingRecord && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Calculation Analysis</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detailed breakdown of payout</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingRecord(null)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1 text-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recipient</p>
                    <p className="text-sm font-black text-slate-900">{viewingRecord.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 italic mt-1">{viewingRecord.category}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-black text-blue-900">Recorded</p>
                    <p className="text-[9px] font-bold text-blue-400 italic mt-1">{new Date(viewingRecord.date?.toDate?.() || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">System Capacity</span>
                    <span className="text-xs font-black text-slate-900">{viewingRecord.kw}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Sold Price</span>
                    <span className="text-xs font-black text-slate-900">₹{viewingRecord.soldAt.toLocaleString()}</span>
                  </div>
                  {viewingRecord.category === 'Sales Person' && (
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Base Rate</span>
                      <span className="text-xs font-black text-slate-900">₹{viewingRecord.mrp.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Company Share</span>
                    <span className="text-xs font-black text-blue-600">₹{viewingRecord.companyShare.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-4 bg-emerald-50 rounded-2xl px-6">
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Final Commission</span>
                    <span className="text-xl font-black text-emerald-700">₹{viewingRecord.commissionAmount.toLocaleString()}</span>
                  </div>
                </div>

                {viewingRecord.leadId && (() => {
                  const lead = leads.find(l => l.id === viewingRecord.leadId);
                  return lead ? (
                    <div className="p-6 bg-zinc-900 rounded-[2rem] text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked Lead History</span>
                      </div>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-400 font-bold">Customer</span>
                           <span className="text-xs font-black">{lead.customerName}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-400 font-bold">Survey By</span>
                           <span className="text-xs font-black">{lead.visitedBy || 'N/A'}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-400 font-bold">Assigned Sales</span>
                           <span className="text-xs font-black">{lead.assignedSales || 'N/A'}</span>
                         </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remarks</p>
                   <p className="text-xs font-bold text-slate-600 leading-relaxed italic">{viewingRecord.remark}</p>
                </div>
              </div>

              <div className="p-8 pt-0">
                <button 
                  onClick={() => setViewingRecord(null)}
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all active:scale-95"
                >
                  Close Analysis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
