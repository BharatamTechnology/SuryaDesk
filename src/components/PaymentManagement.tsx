import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CreditCard, 
  Search, 
  Plus, 
  History, 
  IndianRupee, 
  Calendar, 
  User, 
  Tag, 
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  ArrowLeft,
  Filter,
  FileText,
  Trash2,
  Check,
  X
} from "lucide-react";
import { paymentService } from "../services/paymentService";
import { leadService } from "../services/leadService";
import { userService } from "../services/userService";
import { Lead, PaymentRecord, AppUser } from "../types";
import { format } from "date-fns";

interface PaymentManagementProps {
  user: { email: string; name: string; role: AppUser['role'] };
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({ user }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = userService.subscribeToUsers((data) => {
      setUsers(data || []);
    });
    return () => unsub();
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [paymentSubTab, setPaymentSubTab] = useState<'history' | 'form'>('form');

  // Deletion logic for admin
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdminUser = user.role === 'Admin' || user.email === 'hemant.tyagi@bharatamtechnology.com';

  const isAssigneeForPayment = (p: PaymentRecord) => {
    if (isAdminUser) return true;
    if (!p.confirmationAssignee) return false;
    
    const userEmailClean = (user.email || "").toLowerCase().trim();
    const assigneeClean = (p.confirmationAssignee || "").toLowerCase().trim();
    const userNameClean = (user.name || "").toLowerCase().trim();
    
    if (userNameClean === assigneeClean) return true;
    
    // Add default test accounts and fallbacks just like in firestore.rules
    if (assigneeClean === 'admin' && (userEmailClean === 'hemant.tyagi@bharatamtechnology.com')) return true;
    if ((assigneeClean === 'sitvik' || assigneeClean === 'sitvik (admin)' || assigneeClean === 'satvik') && userEmailClean === 'sitvik24@gmail.com') return true;
    if (assigneeClean === 'anmol rathi' && userEmailClean === 'anmolrathi20@gmail.com') return true;
    if (assigneeClean === 'test user' && (userEmailClean === 'testuser@example.com' || userEmailClean === 'hemant.tyagi@bharatamtechnology.com')) return true;
    
    return false;
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!isAdminUser) return;
    setIsDeleting(true);
    setError(null);
    try {
      await paymentService.deletePayment(paymentId);
      setDeletingPaymentId(null);
    } catch (err: any) {
      console.error("Failed to delete payment:", err);
      setError(err.message || "Failed to delete payment. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    utrNo: "",
    paymentType: "Advance" as PaymentRecord['paymentType'],
    method: "Bank Transfer",
    remarks: "",
    confirmationAssignee: "" as PaymentRecord['confirmationAssignee']
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = leadService.subscribeToLeads(
      user.role, 
      user.email, 
      (allLeads) => {
        const filtered = allLeads.filter(l => l.status === 'Won' || l.isFinancialsSubmitted);
        setLeads(filtered);
        
        // Keep selectedLead in sync if one is selected
        setSelectedLead(prev => {
          if (!prev) return null;
          const updated = allLeads.find(l => l.id === prev.id);
          return updated || prev;
        });
        
        setLoading(false);
      },
      (err) => {
        console.error("PaymentManagement: subscribeToLeads error:", err);
        setError("Failed to load leads from database.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user.role, user.email]);

  useEffect(() => {
    if (selectedLead) {
      const unsub = paymentService.subscribeToPaymentsByLead(selectedLead.id, (history) => {
        setPayments(history || []);
      });
      return () => unsub();
    } else {
      setPayments([]);
    }
  }, [selectedLead?.id]);

  useEffect(() => {
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        confirmationAssignee: selectedLead.accAssignee || ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        confirmationAssignee: ""
      }));
    }
  }, [selectedLead?.id, selectedLead?.accAssignee]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      (l.customerName || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (l.leadId || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (l.customerEmail || "").toLowerCase().includes((searchQuery || "").toLowerCase())
    );
  }, [leads, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !formData.amount || !formData.utrNo) return;
    if (!formData.confirmationAssignee) {
      setError("Please select a verification assignee. All payments require confirmation/verification.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await paymentService.addPayment({
        leadId: selectedLead.id,
        leadName: selectedLead.customerName,
        amount: parseFloat(formData.amount),
        date: formData.date,
        utrNo: formData.utrNo,
        paymentType: formData.paymentType,
        method: formData.method,
        remarks: formData.remarks,
        status: 'Pending',
        confirmationAssignee: formData.confirmationAssignee
      });

      // Reset form
      setFormData({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        utrNo: "",
        paymentType: "Advance",
        method: "Bank Transfer",
        remarks: "",
        confirmationAssignee: ""
      });
      setIsAddingPayment(false);
    } catch (err: any) {
      console.error("Failed to add payment:", err);
      setError(err.message || "Failed to record payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalReceived = (lead: Lead) => {
    if (typeof lead.payment_receivedAmount === 'number') {
      return lead.payment_receivedAmount;
    }
    
    return (Number(lead.advanceAmount) || 0) + 
           (Number(lead.s4_firstInstallmentAmount) || 0) + 
           (Number(lead.s9_secondInstallmentAmount) || 0) + 
           (Number(lead.s10_balanceAmount) || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6">
      {/* List Panel */}
      <div className={`w-full md:w-80 flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shrink-0 shadow-sm ${selectedLead && mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 space-y-4 bg-slate-50/55">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-black tracking-tight text-slate-900">Customers</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium shadow-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/40">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No matching customers found
            </div>
          ) : (
            filteredLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => {
                  setSelectedLead(lead);
                  setMobileView('detail');
                }}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-all group relative ${
                  selectedLead?.id === lead.id 
                    ? 'bg-gradient-to-r from-indigo-50/40 to-white border-l-4 border-l-indigo-600' 
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/75 px-1.5 py-0.5 rounded">{lead.leadId}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider transition-all border ${
                    lead.payment_status === 'Full' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    lead.payment_status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-150'
                  }`}>
                    {lead.payment_status || 'Unpaid'}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-indigo-700 transition-colors">{lead.customerName}</h4>
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-slate-500 font-bold">
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-600">₹</div>
                  <span>Received: <span className="text-slate-900 font-extrabold">₹{calculateTotalReceived(lead).toLocaleString()}</span></span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={`flex-1 flex flex-col gap-4 md:gap-6 overflow-y-auto h-full ${!selectedLead || mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {selectedLead ? (
          <>
            {/* Header info */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-zinc-950 text-white rounded-3xl p-5 md:p-6 shadow-xl shrink-0 border border-slate-800/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
                <div className="w-full">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden flex items-center gap-1.5 text-indigo-300 hover:text-white text-[10px] font-black uppercase tracking-widest mb-3 bg-white/5 active:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-all w-fit"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
                  </button>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-500/30">
                      {selectedLead.leadId}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded font-black uppercase tracking-wider border transition-all ${
                      selectedLead.payment_status === 'Full' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : selectedLead.payment_status === 'Partial' 
                          ? 'bg-emerald-500/20 text-amber-300 border-amber-500/30' 
                          : 'bg-slate-500/20 text-slate-350 border-slate-500/30'
                    }`}>
                      {selectedLead.payment_status || 'Unpaid'}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight text-white mb-2 leading-none">{selectedLead.customerName}</h2>
                  <p className="text-slate-400 text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Won Lead
                    </span>
                    <span className="text-slate-700 font-bold">•</span>
                    <span>Package: {selectedLead.stdPackage || 'Solar Plan'}</span>
                    <span className="text-slate-700 font-bold">•</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded text-indigo-200 font-extrabold">{selectedLead.finalKw || '?'} KW</span>
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 w-full sm:w-auto shrink-0">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1 leading-none">Agreement Value</p>
                  <p className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                    ₹{(Number(selectedLead.finalRate) || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-6 relative z-10">
                <div className="bg-emerald-500/10 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/25 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 block leading-none">Total Received</span>
                  <div>
                    <span className="text-[9px] text-white/45 block font-black leading-none mb-1 uppercase tracking-wider">Cleared & Posted</span>
                    <p className="text-base md:text-xl font-black text-emerald-300">₹{calculateTotalReceived(selectedLead).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-emerald-500/10 backdrop-blur-sm p-4 rounded-2xl border border-amber-500/25 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 block leading-none">Balance Due</span>
                  <div>
                    <span className="text-[9px] text-white/45 block font-black leading-none mb-1 uppercase tracking-wider">Remaining</span>
                    <p className="text-base md:text-xl font-black text-amber-300">₹{(Math.max(0, (Number(selectedLead.finalRate) || 0) - calculateTotalReceived(selectedLead))).toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-indigo-500/10 backdrop-blur-sm p-4 rounded-2xl border border-indigo-500/25 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 block leading-none">KW Rating</span>
                  <div>
                    <span className="text-[9px] text-white/45 block font-black leading-none mb-1 uppercase tracking-wider">Capacity Installed</span>
                    <p className="text-base md:text-xl font-black text-indigo-300">{selectedLead.finalKw || '0'} KW</p>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest mb-2 block leading-none">Payment Status</span>
                  <div>
                    <span className="text-[9px] text-white/45 block font-black leading-none mb-1 uppercase tracking-wider">Collection State</span>
                    <p className="text-base md:text-xl font-black text-white">{selectedLead.payment_status || 'Unpaid'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Elegant Universal Segmented Tab Controller */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 my-1 self-stretch shadow-inner shrink-0 relative z-10 select-none">
              <button
                type="button"
                onClick={() => setPaymentSubTab('form')}
                className={`flex-1 py-3 text-center rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  paymentSubTab === 'form'
                    ? 'bg-white text-indigo-700 shadow-md border border-indigo-150/30'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-4 h-4 text-indigo-600" /> Record New Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentSubTab('history')}
                className={`flex-1 py-3 text-center rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  paymentSubTab === 'history'
                    ? 'bg-white text-indigo-700 shadow-md border border-indigo-150/30'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4 text-indigo-600" /> Transaction History Ledger ({payments.length})
              </button>
            </div>

            {/* Content Container (Full Width per Active Tab) */}
            <div className="flex-1 flex flex-col relative z-10 w-full mb-6">
              {paymentSubTab === 'history' && (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 flex flex-col shadow-sm animate-fadeIn">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Payments Receipt Registry</h3>
                    </div>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100/50">
                      {payments.length} Transaction{payments.length !== 1 ? 's' : ''} Posted
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    {payments.length === 0 ? (
                      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 gap-3 py-12">
                        <TrendingDown className="w-16 h-16 opacity-25 text-indigo-640 animate-pulse" />
                        <p className="text-base font-extrabold text-slate-700">No transaction records found</p>
                        <p className="text-xs text-slate-400 text-center max-w-sm">Use the "Record New Payment" tab above to post the first financial entry for this customer.</p>
                      </div>
                    ) : (
                      payments.map((p, idx) => {
                        const borderColorClass = p.status === 'Confirmed' ? 'border-l-emerald-500' : p.status === 'Rejected' ? 'border-l-rose-500' : 'border-l-amber-500';
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={p.id} 
                            className={`bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group border-l-4 ${borderColorClass}`}
                          >
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               {/* Left Section: Info & status tags */}
                               <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-100/60 uppercase tracking-wider">
                                       Phase: {p.paymentType}
                                     </span>
                                     {p.status === 'Pending' && (
                                       <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-150 animate-pulse">
                                         Verification Required: {p.confirmationAssignee}
                                       </span>
                                     )}
                                     {p.status === 'Pending' && isAssigneeForPayment(p) && (
                                       <div className="flex items-center gap-1.5 mt-1">
                                         <button
                                           onClick={async (e) => {
                                             e.stopPropagation();
                                             if (window.confirm(`Confirm payment of ₹${p.amount.toLocaleString()}?`)) {
                                               try {
                                                 await paymentService.confirmPayment(p.id, {});
                                                 const updatedLead = await leadService.getLead(selectedLead!.id);
                                                 if (updatedLead) {
                                                   setSelectedLead(updatedLead as Lead);
                                                 }
                                               } catch (err: any) {
                                                 console.error(err);
                                                 alert("Failed to confirm payment: " + err.message);
                                               }
                                             }
                                           }}
                                           className="px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm py-0.5"
                                         >
                                           <Check className="w-3 h-3" /> Approve
                                         </button>
                                         <button
                                           onClick={async (e) => {
                                             e.stopPropagation();
                                             if (window.confirm(`Reject this payment record of ₹${p.amount.toLocaleString()}?`)) {
                                               try {
                                                 await paymentService.rejectPayment(p.id);
                                                 const updatedLead = await leadService.getLead(selectedLead!.id);
                                                 if (updatedLead) {
                                                   setSelectedLead(updatedLead as Lead);
                                                 }
                                               } catch (err: any) {
                                                 console.error(err);
                                                 alert("Failed to reject payment: " + err.message);
                                               }
                                             }
                                           }}
                                           className="px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm py-0.5"
                                         >
                                           <X className="w-3 h-3" /> Reject
                                         </button>
                                       </div>
                                     )}
                                     {p.status === 'Rejected' && (
                                       <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-lg border border-rose-150">
                                         Rejected
                                       </span>
                                     )}
                                     {p.status === 'Confirmed' && (
                                       <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-150">
                                         Cleared / Posted
                                       </span>
                                     )}
                                  </div>
                                  
                                  <div className="text-slate-500 text-xs font-bold font-mono">
                                     UTR / Tx ID: <span className="text-slate-900 font-extrabold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{p.utrNo}</span>
                                  </div>
                               </div>

                               {/* Middle Section: Clear Cleared Amount */}
                               <div className="text-left md:text-right shrink-0 px-1">
                                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Cleared Amount</span>
                                  <div className={`text-2xl font-black tracking-tight ${p.status === 'Confirmed' ? 'text-emerald-600' : p.status === 'Rejected' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                     ₹{p.amount.toLocaleString()}
                                  </div>
                               </div>

                               {/* Right Section: Time & Method Metadata & Action button */}
                               <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 shrink-0">
                                  <div className="text-left md:text-right">
                                     <div className="flex md:justify-end items-center gap-1.5 text-slate-500 font-black text-xs font-mono">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{p.date}</span>
                                     </div>
                                     <p className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-wider md:text-right bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30 inline-block md:block">{p.method}</p>
                                  </div>
                                  
                                  <div className="border-l border-slate-200 pl-4 text-xs font-bold text-slate-650 hidden sm:block">
                                     <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Logged By</span>
                                     <span className="text-slate-800 font-extrabold truncate max-w-[110px] block">{(() => {
                                         if (!p.recordedBy) return 'System';
                                         const found = users.find(u => u.email && u.email.toLowerCase().trim() === p.recordedBy!.toLowerCase().trim());
                                         if (found && found.name) return found.name;
                                         const emailLower = p.recordedBy.toLowerCase().trim();
                                         if (emailLower === 'hemanttyagi225@gmail.com' || emailLower === 'hemant.tyagi@bharatamtechnology.com') return 'Hemant Tyagi';
                                         const prefix = p.recordedBy.split('@')[0];
                                         return prefix
                                           .replace(/[._-]/g, ' ')
                                           .replace(/([a-z])([0-9])/g, '$1 $2')
                                           .split(' ')
                                           .filter(Boolean)
                                           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                           .join(' ') || 'System';
                                       })()}</span>
                                  </div>

                                  {isAdminUser && (
                                    <div className="shrink-0 ml-1 border-l border-slate-200 pl-4 flex items-center justify-center">
                                      {deletingPaymentId === p.id ? (
                                        <div className="flex flex-col gap-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeletePayment(p.id);
                                            }}
                                            disabled={isDeleting}
                                            className="px-2.5 py-1 bg-rose-650 text-white text-[9px] font-black rounded hover:bg-rose-700 transition-colors uppercase tracking-wider text-center"
                                          >
                                            {isDeleting ? '...' : 'Confirm'}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingPaymentId(null);
                                            }}
                                            className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[9px] font-black rounded hover:bg-slate-50 transition-colors uppercase tracking-wider text-center"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingPaymentId(p.id);
                                          }}
                                          className="text-slate-350 hover:text-rose-600 hover:bg-rose-55 p-2 rounded-xl transition-all"
                                          title="Delete payment entry"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                               </div>
                             </div>

                             {p.remarks && (
                               <div className="mt-4 p-3 bg-slate-50/70 border border-slate-100 rounded-xl italic text-slate-700 text-xs flex gap-1.5 items-start">
                                 <span className="font-extrabold text-slate-400 not-italic uppercase tracking-wider text-[9px] bg-slate-200/60 px-1.5 py-0.5 rounded shrink-0">Note</span>
                                 <span>"{p.remarks}"</span>
                               </div>
                             )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {paymentSubTab === 'form' && (
                <div className="flex-1 w-full flex justify-center py-1 animate-fadeIn">
                  <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 flex flex-col shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-emerald-500 text-white shrink-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Plus className="w-5 h-5 text-amber-400" />
                          <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">Record Dynamic Payment</h3>
                        </div>
                        <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-mono font-bold text-slate-300 border border-white/5">
                          Remaining Balance: ₹{Math.max(0, (Number(selectedLead.finalRate) || 0) - calculateTotalReceived(selectedLead)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
                      {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold animate-pulse">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {error}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Payment Phase / Type</label>
                          <select 
                            value={formData.paymentType}
                            onChange={(e) => setFormData({...formData, paymentType: e.target.value as any})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer h-12 md:h-11 shadow-sm appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`, strokeWidth: 2, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                          >
                            <option value="Advance">Advance</option>
                            <option value="Installment 1">Installment 1</option>
                            <option value="Installment 2">Installment 2</option>
                            <option value="Balance">Balance</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Verification Assignee</label>
                          <select 
                            required
                            value={formData.confirmationAssignee}
                            onChange={(e) => setFormData({...formData, confirmationAssignee: e.target.value as any})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer h-12 md:h-11 shadow-sm appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`, strokeWidth: 2, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                          >
                            <option value="" disabled>Select for verification / confirmation *</option>
                            {selectedLead?.accAssignee && users.some(u => u.name === selectedLead.accAssignee && (u.role === 'Admin' || u.category === 'Accountant')) && (
                              <option value={selectedLead.accAssignee}>Assigned Accountant: {selectedLead.accAssignee}</option>
                            )}
                            {users
                              .filter(u => u.name && u.email && u.name !== selectedLead?.accAssignee && (u.role === 'Admin' || u.category === 'Accountant'))
                              .map(u => (
                                <option key={u.email} value={u.name}>{u.name} ({u.category === 'Accountant' ? 'Accountant' : 'Admin'})</option>
                              ))
                            }
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Cleared Amount (INR)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-500 select-none">₹</div>
                          <input 
                            type="number"
                            inputMode="decimal"
                            required
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono h-12 md:h-11 shadow-sm text-indigo-750"
                          />
                        </div>

                        {/* Quick fill helper buttons for optimal mobile/desktop workflow */}
                        {(() => {
                          const balance = Math.max(0, (Number(selectedLead.finalRate) || 0) - calculateTotalReceived(selectedLead));
                          if (balance > 0) {
                            return (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, amount: balance.toString() })}
                                  className="px-3 py-1.5 bg-indigo-50 active:bg-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-lg border border-indigo-200/40 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                  Fill Entire Balance: ₹{balance.toLocaleString()}
                                </button>
                                {[10000, 25000, 50000].map(val => (
                                  val < balance && (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => setFormData({ ...formData, amount: val.toString() })}
                                      className="px-2.5 py-1.5 bg-slate-50 active:bg-slate-100 text-slate-650 text-xs font-black rounded-lg border border-slate-200 transition-all active:scale-95"
                                    >
                                      ₹{val.toLocaleString()}
                                    </button>
                                  )
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Entry Date</label>
                          <input 
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm font-extrabold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono h-12 md:h-11 shadow-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Payment Method</label>
                          <select 
                            value={formData.method}
                            onChange={(e) => setFormData({...formData, method: e.target.value})}
                            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer h-12 md:h-11 shadow-sm appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`, strokeWidth: 2, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="UPI / QR Code">UPI / QR Code</option>
                            <option value="Cash Entry">Cash Entry</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">UTR / Transaction Reference Number</label>
                        <input 
                          type="text"
                          required
                          placeholder="Enter UTR reference"
                          value={formData.utrNo}
                          onChange={(e) => setFormData({...formData, utrNo: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono h-12 md:h-11 shadow-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Context Remarks & Notes</label>
                        <textarea 
                          rows={3}
                          placeholder="Optional details or transaction notes..."
                          value={formData.remarks}
                          onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none shadow-sm"
                        />
                      </div>

                      <button 
                        disabled={saving}
                        className="w-full py-4 bg-indigo-600 hover:bg-zinc-900 hover:shadow-lg focus:ring-4 focus:ring-indigo-100 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 h-14"
                      >
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>Save Payment History</>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200/80 text-slate-400 p-8">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-10 h-10 opacity-30 text-indigo-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Financial Administration Board</h3>
            <p className="max-w-md text-center text-xs text-slate-500 font-medium leading-relaxed">Select active customer profile from the left directory column to load agreement metrics, pending instalments, and cleared transaction invoices.</p>
          </div>
        )}
      </div>
    </div>
  );
};
