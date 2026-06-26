import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Users, 
  User as UserIcon, 
  Trash2, 
  Plus, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Pencil, 
  X, 
  History, 
  ChevronDown, 
  PlusCircle, 
  MinusCircle, 
  Save, 
  Undo2, 
  Eye, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  FolderOpen,
  Users2
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
  
  // Active Tab: 'Sales Person' | 'Sales Partner'
  const [activeTab, setActiveTab] = useState<'Sales Person' | 'Sales Partner'>('Sales Person');

  // Step 1: Project Type / Scheme Filter (Project selection stage)
  const [projectSchemeFilter, setProjectSchemeFilter] = useState<'All' | 'PM Surya Ghar' | 'SSO' | 'Surya Ghar + SSO'>('All');
  
  // Step 2: Selected Lead State (reset when tab changes)
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');

  // Editable Lead Financial Overrides
  const [totalValue, setTotalValue] = useState<number>(0);
  const [paymentReceived, setPaymentReceived] = useState<number>(0);
  const [paymentDue, setPaymentDue] = useState<number>(0);

  // ----------------------------------------------------
  // Sales Person Tab Recipient States
  // ----------------------------------------------------
  const [selectedSalesEmail, setSelectedSalesEmail] = useState<string>('');
  const [salesPercent, setSalesPercent] = useState<number>(5);
  
  // Optional Sales Creator row
  const [isCreatorActiveSales, setIsCreatorActiveSales] = useState<boolean>(false);
  const [selectedCreatorEmailSales, setSelectedCreatorEmailSales] = useState<string>('');
  const [creatorPercentSales, setCreatorPercentSales] = useState<number>(2);

  const [salesCalculated, setSalesCalculated] = useState<boolean>(false);
  const [calculatedSalesAmt, setCalculatedSalesAmt] = useState<number>(0);
  const [calculatedCreatorAmtSales, setCalculatedCreatorAmtSales] = useState<number>(0);

  // ----------------------------------------------------
  // Sales Partner Tab Recipient States
  // ----------------------------------------------------
  const [selectedPartnerEmail, setSelectedPartnerEmail] = useState<string>('');
  const [partnerPercent, setPartnerPercent] = useState<number>(5);
  
  // Optional Partner Creator row
  const [isCreatorActivePartner, setIsCreatorActivePartner] = useState<boolean>(false);
  const [selectedCreatorEmailPartner, setSelectedCreatorEmailPartner] = useState<string>('');
  const [creatorPercentPartner, setCreatorPercentPartner] = useState<number>(2);

  const [partnerCalculated, setPartnerCalculated] = useState<boolean>(false);
  const [calculatedPartnerAmt, setCalculatedPartnerAmt] = useState<number>(0);
  const [calculatedCreatorAmtPartner, setCalculatedCreatorAmtPartner] = useState<number>(0);

  // ----------------------------------------------------
  // Management, Edit Payout, & Details States
  // ----------------------------------------------------
  const [editingRecord, setEditingRecord] = useState<CommissionRecord | null>(null);
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [viewingRecord, setViewingRecord] = useState<CommissionRecord | null>(null);

  // Real-time subscribers
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

  // Reset Lead selection when switching categories
  useEffect(() => {
    setSelectedLeadId('');
    setSalesCalculated(false);
    setPartnerCalculated(false);
    setIsCreatorActiveSales(false);
    setIsCreatorActivePartner(false);
  }, [activeTab]);

  // ----------------------------------------------------
  // Lead Filters for each Tab based on User Roles
  // ----------------------------------------------------
  
  // 1. Leads filtered for Sales Person Tab (only leads where assigned user is a Sales Person)
  const salesPersonLeads = useMemo(() => {
    return leads.filter(lead => {
      // Check project scheme filter first
      if (projectSchemeFilter !== 'All' && lead.projectType !== projectSchemeFilter) {
        return false;
      }

      const salesEmail = lead.assignedSalesEmail?.toLowerCase().trim();
      const preSalesEmail = lead.assignedPreSales?.toLowerCase().trim();
      
      if (!salesEmail && !preSalesEmail) return false;

      const matchedSalesUser = users.find(u => u.email.toLowerCase().trim() === salesEmail);
      const matchedPreSalesUser = users.find(u => u.email.toLowerCase().trim() === preSalesEmail);

      // Verify role or fallback if not explicitly found in Team list
      const isSalesPerson = 
        (matchedSalesUser && matchedSalesUser.category === 'Sales Person') ||
        (matchedPreSalesUser && matchedPreSalesUser.category === 'Sales Person') ||
        (!matchedSalesUser && !!salesEmail) ||
        (!matchedPreSalesUser && !!preSalesEmail);

      return isSalesPerson;
    });
  }, [leads, users, projectSchemeFilter]);

  // 2. Leads filtered for Sales Partner Tab (only leads where assigned user is a Sales Partner)
  const salesPartnerLeads = useMemo(() => {
    return leads.filter(lead => {
      // Check project scheme filter first
      if (projectSchemeFilter !== 'All' && lead.projectType !== projectSchemeFilter) {
        return false;
      }

      const partnerEmail = lead.visitedByEmail?.toLowerCase().trim();
      if (!partnerEmail) return false;

      const matchedPartnerUser = users.find(u => u.email.toLowerCase().trim() === partnerEmail);

      const isSalesPartner = 
        (matchedPartnerUser && matchedPartnerUser.category === 'Sales Partner') ||
        (!matchedPartnerUser && !!partnerEmail);

      return isSalesPartner;
    });
  }, [leads, users, projectSchemeFilter]);

  // Find currently selected Lead based on active tab and selected ID
  const selectedLead = useMemo(() => {
    const activeLeadsList = activeTab === 'Sales Person' ? salesPersonLeads : salesPartnerLeads;
    return activeLeadsList.find(l => l.id === selectedLeadId);
  }, [selectedLeadId, activeTab, salesPersonLeads, salesPartnerLeads]);

  // Synchronize financial metrics when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      const val = Number(selectedLead.payment_totalAmount || selectedLead.finalRate || selectedLead.originalRate || 0);
      const rec = Number(selectedLead.payment_receivedAmount || 0);
      const due = Math.max(0, val - rec);

      setTotalValue(val);
      setPaymentReceived(rec);
      setPaymentDue(due);

      setSalesCalculated(false);
      setPartnerCalculated(false);
    } else {
      setTotalValue(0);
      setPaymentReceived(0);
      setPaymentDue(0);
    }
  }, [selectedLead]);

  // ----------------------------------------------------
  // Dropdown Recipient Option Derivations (Smart Stage Logic)
  // ----------------------------------------------------

  // This hook computes the list of users who worked on the 4 stages of the selected lead:
  // - Basic Info, Pre-Sales, Site Survey, Sales & Status
  const activeStageUsers = useMemo(() => {
    if (!selectedLead) return [];

    const list: { user: AppUser; stage: string }[] = [];
    const emailsSeen = new Set<string>();

    const addCandidate = (email: string | undefined, name: string | undefined, defaultCategory: AppUser['category'], stageLabel: string) => {
      if (!email) return;
      const cleanEmail = email.toLowerCase().trim();
      
      const existing = list.find(item => item.user.email.toLowerCase().trim() === cleanEmail);
      if (existing) {
        if (!existing.stage.includes(stageLabel)) {
          existing.stage = `${existing.stage}, ${stageLabel}`;
        }
        return;
      }

      emailsSeen.add(cleanEmail);

      const found = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
      if (found) {
        list.push({
          user: found,
          stage: stageLabel
        });
      } else {
        list.push({
          user: {
            name: name || 'User',
            email: cleanEmail,
            role: 'Executive',
            category: defaultCategory
          },
          stage: stageLabel
        });
      }
    };

    // 1. Basic Info stage: createdBy
    addCandidate(selectedLead.createdBy, selectedLead.createdByName || 'Lead Creator', 'None', 'Basic Info');

    // 2. Pre-Sales stage: assignedPreSales
    addCandidate(selectedLead.assignedPreSales, selectedLead.assignedPreSalesName || 'Pre-Sales Rep', 'Sales Person', 'Pre-Sales');

    // 3. Site Survey stage: visitedByEmail
    addCandidate(selectedLead.visitedByEmail, selectedLead.visitedBy || 'Surveyor', 'Sales Partner', 'Site Survey');

    // 4. Sales & Status stage: assignedSalesEmail
    addCandidate(selectedLead.assignedSalesEmail, selectedLead.assignedSales || 'Sales Rep', 'Sales Person', 'Sales & Status');

    return list;
  }, [selectedLead, users]);

  // Automatically select smart defaults from the users who worked on the stages
  useEffect(() => {
    if (selectedLead && activeStageUsers.length > 0) {
      // Find the Sales Person stage user, fallback to Pre-Sales stage user, fallback to first user
      const salesRep = activeStageUsers.find(item => 
        item.stage.includes('Sales & Status')
      ) || activeStageUsers.find(item => 
        item.stage.includes('Pre-Sales')
      ) || activeStageUsers[0];

      if (salesRep) {
        setSelectedSalesEmail(salesRep.user.email);
      }

      // Find the Site Survey stage user, fallback to first user
      const partnerRep = activeStageUsers.find(item => 
        item.stage.includes('Site Survey')
      ) || activeStageUsers[0];

      if (partnerRep) {
        setSelectedPartnerEmail(partnerRep.user.email);
      }

      // Find the Lead Creator (Basic Info stage user), fallback to first user
      const creatorRep = activeStageUsers.find(item => 
        item.stage.includes('Basic Info')
      ) || activeStageUsers[0];

      if (creatorRep) {
        setSelectedCreatorEmailSales(creatorRep.user.email);
        setSelectedCreatorEmailPartner(creatorRep.user.email);
      }
    } else {
      setSelectedSalesEmail('');
      setSelectedPartnerEmail('');
      setSelectedCreatorEmailSales('');
      setSelectedCreatorEmailPartner('');
    }
  }, [selectedLead, activeStageUsers]);

  // ----------------------------------------------------
  // Interactive Computation Engine
  // ----------------------------------------------------
  
  const calculateSalesCommission = () => {
    if (!selectedLead) return;
    setCalculatedSalesAmt(Math.round(totalValue * (salesPercent / 100)));
    if (isCreatorActiveSales) {
      setCalculatedCreatorAmtSales(Math.round(totalValue * (creatorPercentSales / 100)));
    } else {
      setCalculatedCreatorAmtSales(0);
    }
    setSalesCalculated(true);
  };

  const calculatePartnerCommission = () => {
    if (!selectedLead) return;
    setCalculatedPartnerAmt(Math.round(totalValue * (partnerPercent / 100)));
    if (isCreatorActivePartner) {
      setCalculatedCreatorAmtPartner(Math.round(totalValue * (creatorPercentPartner / 100)));
    } else {
      setCalculatedCreatorAmtPartner(0);
    }
    setPartnerCalculated(true);
  };

  const cancelSalesCalculation = () => {
    setSalesCalculated(false);
    setCalculatedSalesAmt(0);
    setCalculatedCreatorAmtSales(0);
  };

  const cancelPartnerCalculation = () => {
    setPartnerCalculated(false);
    setCalculatedPartnerAmt(0);
    setCalculatedCreatorAmtPartner(0);
  };

  // ----------------------------------------------------
  // Persistent Save Operations
  // ----------------------------------------------------

  const saveSalesCommission = async () => {
    if (!selectedLead) return;
    if (!salesCalculated) {
      alert("Please calculate the commission amount first to verify figures.");
      return;
    }

    try {
      // 1. Save Sales Person Record
      if (selectedSalesEmail) {
        const item = activeStageUsers.find(u => u.user.email === selectedSalesEmail);
        const name = item?.user.name || 'Sales Person';
        
        await commissionService.addCommissionRecord({
          leadId: selectedLead.id,
          leadName: selectedLead.customerName,
          leadIdString: selectedLead.leadId,
          recipientName: name,
          recipientEmail: selectedSalesEmail,
          roleType: 'Sales Person',
          totalProjectValue: totalValue,
          paymentReceived,
          paymentDue,
          percentage: salesPercent,
          totalCommission: calculatedSalesAmt,
          commissionPaid: 0,
          commissionDue: calculatedSalesAmt,
          category: 'Sales Person',
          remark: `Sales Person Commission calculated at ${salesPercent}% of ₹${totalValue.toLocaleString()}`
        });
      }

      // 2. Save Lead Creator Record (if optional row is active)
      if (isCreatorActiveSales && selectedCreatorEmailSales) {
        const item = activeStageUsers.find(u => u.user.email === selectedCreatorEmailSales);
        const name = item?.user.name || 'Lead Creator';

        await commissionService.addCommissionRecord({
          leadId: selectedLead.id,
          leadName: selectedLead.customerName,
          leadIdString: selectedLead.leadId,
          recipientName: name,
          recipientEmail: selectedCreatorEmailSales,
          roleType: 'Lead Creator',
          totalProjectValue: totalValue,
          paymentReceived,
          paymentDue,
          percentage: creatorPercentSales,
          totalCommission: calculatedCreatorAmtSales,
          commissionPaid: 0,
          commissionDue: calculatedCreatorAmtSales,
          category: 'Sales Person',
          remark: `Lead Creator Commission calculated at ${creatorPercentSales}% of ₹${totalValue.toLocaleString()} (Sales Stage)`
        });
      }

      // Reset states
      setSelectedLeadId('');
      setSalesCalculated(false);
      setIsCreatorActiveSales(false);
      alert("Commission Ledger Record successfully saved!");
    } catch (err) {
      console.error("Error saving commission record:", err);
      alert("An error occurred while saving. Please try again.");
    }
  };

  const savePartnerCommission = async () => {
    if (!selectedLead) return;
    if (!partnerCalculated) {
      alert("Please calculate the commission amount first to verify figures.");
      return;
    }

    try {
      // 1. Save Sales Partner Record
      if (selectedPartnerEmail) {
        const item = activeStageUsers.find(u => u.user.email === selectedPartnerEmail);
        const name = item?.user.name || 'Sales Partner';

        await commissionService.addCommissionRecord({
          leadId: selectedLead.id,
          leadName: selectedLead.customerName,
          leadIdString: selectedLead.leadId,
          recipientName: name,
          recipientEmail: selectedPartnerEmail,
          roleType: 'Sales Partner',
          totalProjectValue: totalValue,
          paymentReceived,
          paymentDue,
          percentage: partnerPercent,
          totalCommission: calculatedPartnerAmt,
          commissionPaid: 0,
          commissionDue: calculatedPartnerAmt,
          category: 'Sales Partner',
          remark: `Sales Partner Commission calculated at ${partnerPercent}% of ₹${totalValue.toLocaleString()}`
        });
      }

      // 2. Save Lead Creator Record (if optional row is active)
      if (isCreatorActivePartner && selectedCreatorEmailPartner) {
        const item = activeStageUsers.find(u => u.user.email === selectedCreatorEmailPartner);
        const name = item?.user.name || 'Lead Creator';

        await commissionService.addCommissionRecord({
          leadId: selectedLead.id,
          leadName: selectedLead.customerName,
          leadIdString: selectedLead.leadId,
          recipientName: name,
          recipientEmail: selectedCreatorEmailPartner,
          roleType: 'Lead Creator',
          totalProjectValue: totalValue,
          paymentReceived,
          paymentDue,
          percentage: creatorPercentPartner,
          totalCommission: calculatedCreatorAmtPartner,
          commissionPaid: 0,
          commissionDue: calculatedCreatorAmtPartner,
          category: 'Sales Partner',
          remark: `Lead Creator Commission calculated at ${creatorPercentPartner}% of ₹${totalValue.toLocaleString()} (Partner Stage)`
        });
      }

      // Reset states
      setSelectedLeadId('');
      setPartnerCalculated(false);
      setIsCreatorActivePartner(false);
      alert("Partner Commission Ledger Record successfully saved!");
    } catch (err) {
      console.error("Error saving partner commission record:", err);
      alert("An error occurred while saving. Please try again.");
    }
  };

  // ----------------------------------------------------
  // Edit & Deletion Handlers
  // ----------------------------------------------------

  const handleOpenEditPayout = (rec: CommissionRecord) => {
    setEditingRecord(rec);
    setEditPaidAmount(rec.commissionPaid || 0);
  };

  const handleSavePayoutEdit = async () => {
    if (!editingRecord) return;
    try {
      const totalComm = editingRecord.totalCommission || 0;
      const paid = Number(editPaidAmount);
      const due = Math.max(0, totalComm - paid);

      await commissionService.updateCommissionRecord(editingRecord.id, {
        commissionPaid: paid,
        commissionDue: due
      });

      setEditingRecord(null);
      alert("Payout details successfully synchronized!");
    } catch (err) {
      console.error("Error updating payout:", err);
      alert("Failed to update payout settings.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this commission ledger record?")) {
      try {
        await commissionService.deleteCommissionRecord(id);
      } catch (err) {
        console.error("Error deleting record:", err);
      }
    }
  };

  // ----------------------------------------------------
  // Filtered Ledgers for each Tab
  // ----------------------------------------------------
  const filteredCommissions = useMemo(() => {
    return commissions.filter(rec => rec.category === activeTab);
  }, [commissions, activeTab]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-0">
      
      {/* Redesigned Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Commission Redesign</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dual-Category, Multi-Recipient Calculations & Ledgers</p>
            </div>
          </div>
        </div>

        {/* Global Project Scheme Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">Project Type:</span>
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            {(['All', 'PM Surya Ghar', 'SSO', 'Surya Ghar + SSO'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setProjectSchemeFilter(type);
                  setSelectedLeadId('');
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${projectSchemeFilter === type ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {type === 'All' ? 'All' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Controller */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md border border-slate-200/40">
        <button
          onClick={() => setActiveTab('Sales Person')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'Sales Person'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-4.5 h-4.5 text-blue-500" />
          <span>Sales Person Tab</span>
        </button>
        <button
          onClick={() => setActiveTab('Sales Partner')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'Sales Partner'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4.5 h-4.5 text-emerald-500" />
          <span>Sales Partner Tab</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      <div className="space-y-8">
        
        {/* TAB 1: SALES PERSON MODULE */}
        {activeTab === 'Sales Person' && (
          <div className="space-y-8">
            
            {/* Form Section */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Calculate Sales Person Payouts</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Sync commissions with active sales pipeline representatives</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg w-fit">Sales Stage</span>
              </div>

              {/* Steps Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Step 2: Choose Customer Lead</label>
                  <div className="relative">
                    <select
                      value={selectedLeadId}
                      onChange={(e) => setSelectedLeadId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">-- Select Lead Assigned to a Sales Person --</option>
                      {salesPersonLeads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.customerName} ({lead.leadId || 'N/A'}) - {lead.status} {lead.projectType ? `| ${lead.projectType}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {salesPersonLeads.length === 0 && (
                    <span className="text-[10px] font-bold text-slate-400 ml-1">No leads matching this category currently detected.</span>
                  )}
                </div>

                {selectedLead ? (
                  <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-0.5">Assigned Customer Project</p>
                      <h4 className="text-sm font-black text-slate-900">{selectedLead.customerName}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-1">
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">{selectedLead.leadId}</span>
                        <span>•</span>
                        <span>{selectedLead.projectType || 'Standard'}</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                      {selectedLead.status}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-slate-300" />
                    <p className="text-[11px] font-bold text-slate-400">Select a lead to unlock calculations and inputs</p>
                  </div>
                )}
              </div>

              {selectedLead && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-2 border-t border-slate-100"
                >
                  {/* Financial Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Lead Value (₹)</span>
                      <input
                        type="number"
                        value={totalValue}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTotalValue(val);
                          setPaymentDue(Math.max(0, val - paymentReceived));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Received (₹)</span>
                      <input
                        type="number"
                        value={paymentReceived}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPaymentReceived(val);
                          setPaymentDue(Math.max(0, totalValue - val));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Remaining Payment Due (₹)</span>
                      <input
                        type="number"
                        value={paymentDue}
                        disabled
                        className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Recipient Rows Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Configure Recipients</span>
                      {!isCreatorActiveSales && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatorActiveSales(true);
                            setSalesCalculated(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add Lead Creator Commission</span>
                        </button>
                      )}
                    </div>

                    {/* Recipient Row 1: Sales Person (Primary, Always Visible) */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient 1: Sales Person</span>
                        <div className="relative">
                          <select
                            value={selectedSalesEmail}
                            onChange={(e) => {
                              setSelectedSalesEmail(e.target.value);
                              setSalesCalculated(false);
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                          >
                            {activeStageUsers.map((item) => (
                              <option key={item.user.email} value={item.user.email}>
                                {item.user.name} ({item.user.email}) — Worked on {item.stage}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="block text-[8px] text-slate-400 font-bold italic">User who negotiated/handled the client</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Commission Percent (%)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={salesPercent}
                            onChange={(e) => {
                              setSalesPercent(Number(e.target.value));
                              setSalesCalculated(false);
                            }}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none"
                          />
                          <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Recipient Row 2: Lead Creator (Optional) */}
                    <AnimatePresence>
                      {isCreatorActiveSales && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 relative overflow-hidden"
                        >
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient 2: Lead Creator</span>
                            <div className="relative">
                              <select
                                value={selectedCreatorEmailSales}
                                onChange={(e) => {
                                  setSelectedCreatorEmailSales(e.target.value);
                                  setSalesCalculated(false);
                                }}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                              >
                                {activeStageUsers.map((item) => (
                                  <option key={item.user.email} value={item.user.email}>
                                    {item.user.name} ({item.user.email}) — Worked on {item.stage}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <span className="block text-[8px] text-slate-400 font-bold italic">User who originally captured/punched the lead</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest font-black">Commission Percent (%)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatorActiveSales(false);
                                  setSalesCalculated(false);
                                }}
                                className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase hover:text-rose-700 tracking-wider"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={creatorPercentSales}
                                onChange={(e) => {
                                  setCreatorPercentSales(Number(e.target.value));
                                  setSalesCalculated(false);
                                }}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Calculation Preview breakdown */}
                  {salesCalculated && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 bg-blue-50 border border-blue-200 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center gap-1.5 text-blue-800 font-black text-[10px] uppercase tracking-wider">
                        <TrendingUp className="w-4 h-4" />
                        <span>Sales Category Live Calculation Breakdown</span>
                      </div>

                      <div className="divide-y divide-blue-200/50 space-y-2 pt-1 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="font-bold text-slate-600">Sales Person ({salesPercent}%):</span>
                          <span className="font-black text-slate-900">₹{calculatedSalesAmt.toLocaleString()}</span>
                        </div>
                        {isCreatorActiveSales && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="font-bold text-slate-600">Lead Creator ({creatorPercentSales}%):</span>
                            <span className="font-black text-slate-900">₹{calculatedCreatorAmtSales.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 font-black text-blue-900 border-t border-blue-200">
                          <span>Combined Total Commission:</span>
                          <span>₹{(calculatedSalesAmt + calculatedCreatorAmtSales).toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={calculateSalesCommission}
                      className="flex-1 min-w-[130px] py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      {salesCalculated ? 'Recalculate' : 'Calculate'}
                    </button>
                    {salesCalculated && (
                      <button
                        type="button"
                        onClick={cancelSalesCalculation}
                        className="flex-1 min-w-[130px] py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={saveSalesCommission}
                      disabled={!salesCalculated}
                      className={`flex-1 min-w-[140px] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${salesCalculated ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-slate-300 shadow-none cursor-not-allowed'}`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Record</span>
                    </button>
                  </div>

                </motion.div>
              )}
            </div>

            {/* Summary Table Section */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sales Person Commission Summary Ledger</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Stored payout and due matrices calculated under the Sales Category</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-5">Name</th>
                      <th className="py-4 px-5">Role</th>
                      <th className="py-4 px-5 text-right">Total Lead Value</th>
                      <th className="py-4 px-5 text-right">Payment Received</th>
                      <th className="py-4 px-5 text-right">Payment Due</th>
                      <th className="py-4 px-5 text-right text-indigo-600 font-bold bg-indigo-50/40">Total Commission</th>
                      <th className="py-4 px-5 text-right">Commission Paid</th>
                      <th className="py-4 px-5 text-right">Commission Due</th>
                      <th className="py-4 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredCommissions.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/40 transition-all font-semibold">
                        <td className="py-3.5 px-5">
                          <div className="font-black text-slate-900">{rec.recipientName}</div>
                          <div className="text-[9px] font-bold text-slate-400">{rec.recipientEmail}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${rec.roleType === 'Lead Creator' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {rec.roleType}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-black">₹{(rec.totalProjectValue || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right text-emerald-600">₹{(rec.paymentReceived || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right text-rose-600">₹{(rec.paymentDue || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right font-black text-indigo-700 bg-indigo-50/20">₹{(rec.totalCommission || 0).toLocaleString()} <span className="text-[8px] font-bold text-slate-400">({rec.percentage}%)</span></td>
                        <td className="py-3.5 px-5 text-right text-emerald-600 font-black">₹{(rec.commissionPaid || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right text-indigo-900 font-black">₹{(rec.commissionDue ?? Math.max(0, (rec.totalCommission || 0) - (rec.commissionPaid || 0))).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingRecord(rec)}
                              className="p-1.5 text-slate-400 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-all"
                              title="Details Log"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditPayout(rec)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-all"
                              title="Sync Payments"
                            >
                              <Pencil className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-all"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredCommissions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                          <HelpCircle className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                          <p>No sales commissions saved currently for this category</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SALES PARTNER MODULE */}
        {activeTab === 'Sales Partner' && (
          <div className="space-y-8">
            
            {/* Form Section */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Calculate Sales Partner Payouts</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage commissions for site surveyors and external affiliate partners</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg w-fit">Partner Stage</span>
              </div>

              {/* Steps Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Step 2: Choose Customer Lead</label>
                  <div className="relative">
                    <select
                      value={selectedLeadId}
                      onChange={(e) => setSelectedLeadId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">-- Select Lead Assigned to a Sales Partner --</option>
                      {salesPartnerLeads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.customerName} ({lead.leadId || 'N/A'}) - {lead.status} {lead.projectType ? `| ${lead.projectType}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {salesPartnerLeads.length === 0 && (
                    <span className="text-[10px] font-bold text-slate-400 ml-1">No leads matching this category currently detected.</span>
                  )}
                </div>

                {selectedLead ? (
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Assigned Customer Project</p>
                      <h4 className="text-sm font-black text-slate-900">{selectedLead.customerName}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-1">
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">{selectedLead.leadId}</span>
                        <span>•</span>
                        <span>{selectedLead.projectType || 'Standard'}</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                      {selectedLead.status}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-slate-300" />
                    <p className="text-[11px] font-bold text-slate-400">Select a lead to unlock calculations and inputs</p>
                  </div>
                )}
              </div>

              {selectedLead && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-2 border-t border-slate-100"
                >
                  {/* Financial Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Lead Value (₹)</span>
                      <input
                        type="number"
                        value={totalValue}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTotalValue(val);
                          setPaymentDue(Math.max(0, val - paymentReceived));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Received (₹)</span>
                      <input
                        type="number"
                        value={paymentReceived}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPaymentReceived(val);
                          setPaymentDue(Math.max(0, totalValue - val));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Remaining Payment Due (₹)</span>
                      <input
                        type="number"
                        value={paymentDue}
                        disabled
                        className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-black text-slate-400 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Recipient Rows Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Configure Recipients</span>
                      {!isCreatorActivePartner && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatorActivePartner(true);
                            setPartnerCalculated(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add Lead Creator Commission</span>
                        </button>
                      )}
                    </div>

                    {/* Recipient Row 1: Sales Partner (Primary, Always Visible) */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 relative font-semibold">
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient 1: Sales Partner</span>
                        <div className="relative">
                          <select
                            value={selectedPartnerEmail}
                            onChange={(e) => {
                              setSelectedPartnerEmail(e.target.value);
                              setPartnerCalculated(false);
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                          >
                            {activeStageUsers.map((item) => (
                              <option key={item.user.email} value={item.user.email}>
                                {item.user.name} ({item.user.email}) — Worked on {item.stage}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="block text-[8px] text-slate-400 font-bold italic">User who executed surveyor checks/partner links</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Commission Percent (%)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={partnerPercent}
                            onChange={(e) => {
                              setPartnerPercent(Number(e.target.value));
                              setPartnerCalculated(false);
                            }}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none"
                          />
                          <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Recipient Row 2: Lead Creator (Optional) */}
                    <AnimatePresence>
                      {isCreatorActivePartner && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 relative overflow-hidden font-semibold"
                        >
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient 2: Lead Creator</span>
                            <div className="relative">
                              <select
                                value={selectedCreatorEmailPartner}
                                onChange={(e) => {
                                  setSelectedCreatorEmailPartner(e.target.value);
                                  setPartnerCalculated(false);
                                }}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                              >
                                {activeStageUsers.map((item) => (
                                  <option key={item.user.email} value={item.user.email}>
                                    {item.user.name} ({item.user.email}) — Worked on {item.stage}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <span className="block text-[8px] text-slate-400 font-bold italic">User who originally captured/punched the lead</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Commission Percent (%)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatorActivePartner(false);
                                  setPartnerCalculated(false);
                                }}
                                className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase hover:text-rose-700 tracking-wider"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={creatorPercentPartner}
                                onChange={(e) => {
                                  setCreatorPercentPartner(Number(e.target.value));
                                  setPartnerCalculated(false);
                                }}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Calculation Preview breakdown */}
                  {partnerCalculated && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                        <TrendingUp className="w-4 h-4" />
                        <span>Partner Category Live Calculation Breakdown</span>
                      </div>

                      <div className="divide-y divide-emerald-200/50 space-y-2 pt-1 text-xs font-semibold">
                        <div className="flex justify-between items-center py-1">
                          <span className="font-bold text-slate-600">Sales Partner ({partnerPercent}%):</span>
                          <span className="font-black text-slate-900">₹{calculatedPartnerAmt.toLocaleString()}</span>
                        </div>
                        {isCreatorActivePartner && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="font-bold text-slate-600">Lead Creator ({creatorPercentPartner}%):</span>
                            <span className="font-black text-slate-900">₹{calculatedCreatorAmtPartner.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 font-black text-emerald-900 border-t border-emerald-200">
                          <span>Combined Total Commission:</span>
                          <span>₹{(calculatedPartnerAmt + calculatedCreatorAmtPartner).toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={calculatePartnerCommission}
                      className="flex-1 min-w-[130px] py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      {partnerCalculated ? 'Recalculate' : 'Calculate'}
                    </button>
                    {partnerCalculated && (
                      <button
                        type="button"
                        onClick={cancelPartnerCalculation}
                        className="flex-1 min-w-[130px] py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={savePartnerCommission}
                      disabled={!partnerCalculated}
                      className={`flex-1 min-w-[140px] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${partnerCalculated ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-slate-300 shadow-none cursor-not-allowed'}`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Record</span>
                    </button>
                  </div>

                </motion.div>
              )}
            </div>

            {/* Summary Table Section */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sales Partner Commission Summary Ledger</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Stored payout and due matrices calculated under the Partner Category</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-5">Name</th>
                      <th className="py-4 px-5">Role</th>
                      <th className="py-4 px-5 text-right">Total Lead Value</th>
                      <th className="py-4 px-5 text-right">Payment Received</th>
                      <th className="py-4 px-5 text-right">Payment Due</th>
                      <th className="py-4 px-5 text-right text-indigo-600 font-bold bg-indigo-50/40">Total Commission</th>
                      <th className="py-4 px-5 text-right">Commission Paid</th>
                      <th className="py-4 px-5 text-right">Commission Due</th>
                      <th className="py-4 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredCommissions.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/40 transition-all font-semibold">
                        <td className="py-3.5 px-5">
                          <div className="font-black text-slate-900">{rec.recipientName}</div>
                          <div className="text-[9px] font-bold text-slate-400">{rec.recipientEmail}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${rec.roleType === 'Lead Creator' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {rec.roleType}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-black">₹{(rec.totalProjectValue || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right text-emerald-600">₹{(rec.paymentReceived || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right text-rose-600">₹{(rec.paymentDue || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right font-black text-indigo-700 bg-indigo-50/20">₹{(rec.totalCommission || 0).toLocaleString()} <span className="text-[8px] font-bold text-slate-400">({rec.percentage}%)</span></td>
                        <td className="py-3.5 px-5 text-right text-emerald-600 font-black">₹{(rec.commissionPaid || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right text-indigo-900 font-black">₹{(rec.commissionDue ?? Math.max(0, (rec.totalCommission || 0) - (rec.commissionPaid || 0))).toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingRecord(rec)}
                              className="p-1.5 text-slate-400 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-all"
                              title="Details Log"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditPayout(rec)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-all"
                              title="Sync Payments"
                            >
                              <Pencil className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-all"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredCommissions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                          <HelpCircle className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                          <p>No partner commissions saved currently for this category</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* DETAILED LEDGER ENTRY VIEW MODAL */}
      <AnimatePresence>
        {viewingRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2.5 text-slate-950">
                  <Calculator className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-sm font-black uppercase tracking-wider">Commission Log Details</h4>
                </div>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Recipient Name</span>
                    <p className="font-black text-slate-900">{viewingRecord.recipientName}</p>
                    <span className="text-[9px] font-bold text-slate-500 block truncate">{viewingRecord.recipientEmail}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Project ID</span>
                    <p className="font-black text-slate-900">{viewingRecord.leadIdString || 'N/A'}</p>
                    <span className="text-[9px] font-bold text-slate-500 block truncate">{viewingRecord.leadName || 'Legacy Lead'}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                    <span className="font-bold text-slate-500">Total Pipeline/Project Value:</span>
                    <span className="font-black text-slate-900">₹{(viewingRecord.totalProjectValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                    <span className="font-bold text-slate-500">Pipeline Payments Received:</span>
                    <span className="font-black text-emerald-600">₹{(viewingRecord.paymentReceived || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                    <span className="font-bold text-slate-500">Pipeline Payments Remaining:</span>
                    <span className="font-black text-rose-600">₹{(viewingRecord.paymentDue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50 bg-slate-50 px-3 rounded-lg text-xs">
                    <span className="font-black text-slate-900">Calculated Percentage:</span>
                    <span className="font-black text-indigo-600">{viewingRecord.percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                    <span className="font-bold text-slate-500">Total Calculated Commission:</span>
                    <span className="font-black text-indigo-600">₹{(viewingRecord.totalCommission || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                    <span className="font-bold text-slate-500">Commission Amount Paid:</span>
                    <span className="font-black text-emerald-600">₹{(viewingRecord.commissionPaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-indigo-50/50 text-indigo-900 text-xs">
                    <span className="font-black uppercase text-[10px] tracking-wider">Remaining Commission Due:</span>
                    <span className="font-black text-sm">₹{(viewingRecord.commissionDue ?? Math.max(0, (viewingRecord.totalCommission || 0) - (viewingRecord.commissionPaid || 0))).toLocaleString()}</span>
                  </div>
                </div>

                {viewingRecord.remark && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Admin Remark Logs</span>
                    <p className="font-bold text-slate-600 leading-relaxed italic">“{viewingRecord.remark}”</p>
                  </div>
                )}
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT PAYOUT AMOUNT MODAL */}
      <AnimatePresence>
        {editingRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2.5 text-slate-950">
                  <Pencil className="w-5 h-5 text-blue-500" />
                  <h4 className="text-sm font-black uppercase tracking-wider">Sync Commission Payout</h4>
                </div>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Recipient Name</span>
                  <p className="font-black text-slate-900 text-sm">{editingRecord.recipientName}</p>
                  <p className="text-[10px] font-bold text-slate-400 leading-none">{editingRecord.recipientEmail}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-500">
                    <span>Total Allocated Commission:</span>
                    <span className="font-black text-slate-900">₹{(editingRecord.totalCommission || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-slate-500">
                    <span>Current Paid Amount:</span>
                    <span className="font-black text-emerald-600">₹{(editingRecord.commissionPaid || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Total Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  />
                  <span className="block text-[9px] text-slate-400 font-bold ml-1">Remaining Commission due will be auto-calculated.</span>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePayoutEdit}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all shadow-md shadow-blue-100"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
