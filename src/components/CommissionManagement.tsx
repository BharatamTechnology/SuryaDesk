import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator, 
  Users, 
  Coins, 
  Trash2, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Search, 
  DollarSign,
  Percent,
  TrendingUp,
  User,
  History,
  FileSpreadsheet,
  CheckCircle,
  X,
  Calendar,
  Info
} from 'lucide-react';
import { commissionService } from '../services/commissionService';
import { leadService } from '../services/leadService';
import { CommissionRole, CommissionEntry, Lead } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CommissionManagementProps {
  userEmail: string;
  isAdmin: boolean;
  onLeadSelect?: (leadId: string) => void;
}

type CommissionRoleType = 'Lead Creator' | 'Sales Person' | 'Sales Partner';
type ActiveTabType = CommissionRoleType | 'Payment History';

const matchLeadCreator = (lead: Lead, name: string) => {
  if (!name) return false;
  const cleanName = name.toLowerCase().trim();
  const createdByName = lead.createdByName?.toLowerCase().trim() || "";
  const createdBy = lead.createdBy?.toLowerCase().trim() || "";
  return createdByName === cleanName || createdBy === cleanName || createdByName.includes(cleanName);
};

const matchSalesPerson = (lead: Lead, name: string) => {
  if (!name) return false;
  const cleanName = name.toLowerCase().trim();
  const commissionSalesPerson = lead.commissionSalesPerson?.toLowerCase().trim() || "";
  return commissionSalesPerson === cleanName;
};

const matchSalesPartner = (lead: Lead, name: string) => {
  if (!name) return false;
  const cleanName = name.toLowerCase().trim();
  const commissionSalesPerson = lead.commissionSalesPerson?.toLowerCase().trim() || "";
  return commissionSalesPerson === cleanName;
};

export const CommissionManagement: React.FC<CommissionManagementProps> = ({ userEmail, isAdmin, onLeadSelect }) => {
  const [activeTab, setActiveTab] = useState<ActiveTabType>(() => {
    return (sessionStorage.getItem('commission_activeTab') as ActiveTabType) || 'Lead Creator';
  });
  const [commissionRoles, setCommissionRoles] = useState<CommissionRole[]>([]);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Person State
  const [selectedPersonId, setSelectedPersonId] = useState<string>(() => {
    return sessionStorage.getItem('commission_selectedPersonId') || '';
  });

  useEffect(() => {
    sessionStorage.setItem('commission_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('commission_selectedPersonId', selectedPersonId);
  }, [selectedPersonId]);

  // Payment modal state
  const [payModalData, setPayModalData] = useState<{
    lead: Lead;
    role: CommissionRoleType;
    person: CommissionRole;
    savedEntry?: CommissionEntry;
  } | null>(null);

  // Search state for payments tab
  const [paymentSearch, setPaymentSearch] = useState('');

  // Real-time row values for sticky footer calculation
  const [rowStates, setRowStates] = useState<Record<string, {
    projectValue: number;
    amountReceived: number;
    dueAmount: number;
    finalAmount: number;
    paidAmount: number;
    dueCommission: number;
  }>>({});

  const handleRowValueChange = useCallback((leadId: string, values: {
    projectValue: number;
    amountReceived: number;
    dueAmount: number;
    finalAmount: number;
    paidAmount: number;
    dueCommission: number;
  }) => {
    setRowStates(prev => {
      const prevVal = prev[leadId];
      if (
        prevVal &&
        prevVal.projectValue === values.projectValue &&
        prevVal.amountReceived === values.amountReceived &&
        prevVal.dueAmount === values.dueAmount &&
        prevVal.finalAmount === values.finalAmount &&
        prevVal.paidAmount === values.paidAmount &&
        prevVal.dueCommission === values.dueCommission
      ) {
        return prev;
      }
      return {
        ...prev,
        [leadId]: values
      };
    });
  }, []);

  // Clear live states when person or tab changes
  useEffect(() => {
    setRowStates({});
  }, [selectedPersonId, activeTab]);

  // Subscribe to real-time resources
  useEffect(() => {
    setLoading(true);
    
    const unsubRoles = commissionService.subscribeToCommissionRoles((fetchedRoles) => {
      setCommissionRoles(fetchedRoles);
    });

    const unsubEntries = commissionService.subscribeToCommissionEntries((fetchedEntries) => {
      setCommissionEntries(fetchedEntries);
    });

    const unsubLeads = leadService.subscribeToLeads(
      isAdmin ? 'Admin' : 'Executive', 
      userEmail, 
      (fetchedLeads) => {
        setLeads(fetchedLeads);
        setLoading(false);
      }
    );

    return () => {
      unsubRoles();
      unsubEntries();
      unsubLeads();
    };
  }, [isAdmin, userEmail]);

  // Roles matching active tab type
  const activeRoles = useMemo(() => {
    if (activeTab === 'Payment History') return [];
    return commissionRoles.filter(role => role.role === activeTab);
  }, [commissionRoles, activeTab]);

  // When active tab changes, pre-select first person or clear, only if current selection is invalid
  useEffect(() => {
    if (activeRoles.length > 0) {
      const isCurrentSelectionValid = activeRoles.some(r => r.id === selectedPersonId);
      if (!isCurrentSelectionValid) {
        setSelectedPersonId(activeRoles[0].id || '');
      }
    } else if (commissionRoles.length > 0) {
      // Only clear if we actually have roles loaded but none match the active tab
      setSelectedPersonId('');
    }
  }, [activeTab, activeRoles, selectedPersonId, commissionRoles.length]);

  // Find currently selected person
  const selectedPerson = useMemo(() => {
    if (activeTab === 'Payment History') return undefined;
    return activeRoles.find(r => r.id === selectedPersonId);
  }, [activeRoles, selectedPersonId, activeTab]);

  // Filter leads associated with selected person
  const associatedLeads = useMemo(() => {
    if (!selectedPerson || activeTab === 'Payment History') return [];
    
    return leads.filter(lead => {
      // Only include leads that are won/converted
      if (lead.status !== 'Won' && lead.status !== 'Converted' && lead.status !== 'Completed') {
        return false;
      }

      if (activeTab === 'Lead Creator') {
        return matchLeadCreator(lead, selectedPerson.name);
      } else if (activeTab === 'Sales Person') {
        return matchSalesPerson(lead, selectedPerson.name);
      } else if (activeTab === 'Sales Partner') {
        return matchSalesPartner(lead, selectedPerson.name);
      }
      return false;
    });
  }, [leads, selectedPerson, activeTab]);

  // Handler for saving/updating commission
  const handleSaveCommission = async (
    entryData: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ) => {
    const existing = commissionEntries.find(
      entry => entry.leadId === entryData.leadId && entry.role === entryData.role
    );

    if (existing && existing.id) {
      await commissionService.updateCommissionEntry(existing.id, entryData);
    } else {
      await commissionService.saveCommissionEntry(entryData);
    }
  };

  const handleDeleteCommission = async (id: string) => {
    await commissionService.deleteCommissionEntry(id);
  };

  // Compile flat list of all transactions across all ledger entries
  const allPayments = useMemo(() => {
    const list: {
      id: string;
      entryId: string;
      leadName: string;
      leadIdString: string;
      payeeName: string;
      role: string;
      amount: number;
      date: string;
      paymentMode: string;
      utrNumber: string;
      remark: string;
      createdAt: string;
    }[] = [];

    commissionEntries.forEach(entry => {
      if (entry.payments && Array.isArray(entry.payments)) {
        entry.payments.forEach((p: any) => {
          list.push({
            id: p.id,
            entryId: entry.id || '',
            leadName: entry.leadName || '',
            leadIdString: entry.leadIdString || '',
            payeeName: entry.personName || '',
            role: entry.role,
            amount: Number(p.amount || 0),
            date: p.date || '',
            paymentMode: p.paymentMode || '',
            utrNumber: p.utrNumber || '',
            remark: p.remark || '',
            createdAt: p.createdAt || p.date || ''
          });
        });
      }
    });

    // Sort descending by date
    return list.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [commissionEntries]);

  // Filter payments matching the search field
  const filteredPayments = useMemo(() => {
    if (!paymentSearch.trim()) return allPayments;
    const query = paymentSearch.toLowerCase().trim();
    return allPayments.filter(p => 
      p.leadName.toLowerCase().includes(query) ||
      p.payeeName.toLowerCase().includes(query) ||
      p.leadIdString.toLowerCase().includes(query) ||
      p.utrNumber.toLowerCase().includes(query) ||
      p.paymentMode.toLowerCase().includes(query)
    );
  }, [allPayments, paymentSearch]);

  // Handle saving a newly processed payment
  const handleSavePayment = async (
    lead: Lead,
    role: CommissionRoleType,
    person: CommissionRole,
    savedEntry: CommissionEntry | undefined,
    paymentDetails: {
      amount: number;
      date: string;
      paymentMode: string;
      utrNumber: string;
      remark: string;
    }
  ) => {
    const newPayment = {
      id: Math.random().toString(36).substring(2, 9),
      amount: paymentDetails.amount,
      date: paymentDetails.date,
      paymentMode: paymentDetails.paymentMode,
      utrNumber: paymentDetails.utrNumber,
      remark: paymentDetails.remark,
      createdAt: new Date().toISOString()
    };

    const existingPayments = savedEntry?.payments || [];
    const updatedPayments = [...existingPayments, newPayment];
    const updatedPaidAmount = (savedEntry?.paidAmount || 0) + paymentDetails.amount;

    // Calculate commissionAfterDiscount
    const projectValue = Number(lead.finalRate || lead.originalRate || 0);
    const baseRate = Number(lead.originalRate || 0);
    const discount = Number(lead.discount || 0);
    let calculatedCommission = 0;
    if (role === 'Lead Creator') {
      const kw = parseFloat(lead.finalKw || lead.requiredKw || "0") || 0;
      calculatedCommission = Math.round(kw * (person.ratePerKw || 0));
    } else {
      if (person.rateType === 'flat') {
        calculatedCommission = person.rateValue || 0;
      } else {
        calculatedCommission = Math.round(baseRate * ((person.rateValue || 0) / 100));
      }
    }
    const commissionAfterDiscount = role === 'Lead Creator' ? calculatedCommission : (calculatedCommission - discount);

    const entryData: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { payments?: any[] } = {
      leadId: lead.id,
      leadIdString: lead.leadId,
      leadName: lead.customerName,
      projectValue,
      role,
      personId: person.id || '',
      personName: person.name,
      commissionType: (person.role === 'Lead Creator' || person.rateType === 'flat') ? 'manual' : 'percentage',
      percentageValue: person.role !== 'Lead Creator' && person.rateType === 'percentage' ? (person.rateValue || 0) : 0,
      manualAmount: person.role === 'Lead Creator' ? (person.ratePerKw || 0) : (person.rateType === 'flat' ? (person.rateValue || 0) : 0),
      finalAmount: commissionAfterDiscount,
      paidAmount: updatedPaidAmount,
      payments: updatedPayments
    };

    if (savedEntry && savedEntry.id) {
      await commissionService.updateCommissionEntry(savedEntry.id, entryData);
    } else {
      await commissionService.saveCommissionEntry(entryData);
    }
  };

  // Handle deleting/reverting a transaction
  const handleDeletePayment = async (entryId: string, paymentId: string, amount: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will revert the paid commission amount.')) return;
    
    try {
      const entry = commissionEntries.find(e => e.id === entryId);
      if (!entry) return;

      const updatedPayments = (entry.payments || []).filter((p: any) => p.id !== paymentId);
      const updatedPaidAmount = Math.max(0, (entry.paidAmount || 0) - amount);

      await commissionService.updateCommissionEntry(entryId, {
        paidAmount: updatedPaidAmount,
        payments: updatedPayments
      });
    } catch (err) {
      console.error(err);
      alert('Failed to delete payment record.');
    }
  };

  // Real-time live totals calculated from visible rows and active edits
  const totals = useMemo(() => {
    let totalProjectValue = 0;
    let totalReceived = 0;
    let totalDueAmount = 0;
    let totalCommission = 0;
    let totalPaid = 0;
    let totalDueCommission = 0;

    associatedLeads.forEach(lead => {
      const state = rowStates[lead.id];
      if (state) {
        totalProjectValue += state.projectValue;
        totalReceived += state.amountReceived;
        totalDueAmount += state.dueAmount;
        totalCommission += state.finalAmount;
        totalPaid += state.paidAmount;
        totalDueCommission += state.dueCommission;
      } else {
        const saved = commissionEntries.find(entry => entry.leadId === lead.id && entry.role === activeTab);
        const projVal = Number(lead.finalRate || lead.originalRate || 0);
        const rec = Number(lead.payment_receivedAmount || 0);
        const due = Math.max(0, projVal - rec);
        
        let comm = 0;
        if (selectedPerson) {
          if (activeTab === 'Lead Creator') {
            const kw = parseFloat(lead.finalKw || lead.requiredKw || "0") || 0;
            comm = kw * (selectedPerson.ratePerKw || 0);
          } else {
            const baseRate = Number(lead.originalRate || 0);
            comm = selectedPerson.rateType === 'flat' ? (selectedPerson.rateValue || 0) : (baseRate * (selectedPerson.rateValue || 0) / 100);
          }
        }
        
        const commAfterDisc = activeTab === 'Lead Creator' ? comm : (comm - Number(lead.discount || 0));
        const paid = saved ? (saved.paidAmount || 0) : 0;
        
        totalProjectValue += projVal;
        totalReceived += rec;
        totalDueAmount += due;
        totalCommission += commAfterDisc;
        totalPaid += paid;
        totalDueCommission += commAfterDisc - paid;
      }
    });

    return {
      projectValue: totalProjectValue,
      amountReceived: totalReceived,
      dueAmount: totalDueAmount,
      finalAmount: totalCommission,
      paidAmount: totalPaid,
      dueCommission: totalDueCommission
    };
  }, [associatedLeads, rowStates, commissionEntries, activeTab]);

  // Saved metrics for current selected person
  const stats = useMemo(() => {
    if (!selectedPerson) return { count: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 };
    
    const configuredCount = commissionEntries.filter(
      entry => entry.personId === selectedPerson.id && entry.role === activeTab
    ).length;

    return {
      count: configuredCount,
      totalAmount: totals.finalAmount,
      totalPaid: totals.paidAmount,
      totalDue: totals.dueCommission
    };
  }, [selectedPerson, commissionEntries, activeTab, totals]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Upper header action block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">Commission Ledger</h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Reconcile, calculate, and persist commission distribution schemes for certified roles.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl max-w-xl border border-slate-200">
        {(['Lead Creator', 'Sales Person', 'Sales Partner', 'Payment History'] as ActiveTabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPaymentSearch('');
            }}
            className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab === 'Payment History' && <History className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-sm">
        {activeTab === 'Payment History' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  Commission Payment History
                </h3>
                <p className="text-slate-500 text-xs mt-1">Audit log of all commission payouts processed for creators, partners, and sales reps.</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search payee, project..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center max-w-md mx-auto">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <History className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">No Payments Found</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold mt-2 px-4">
                  {paymentSearch ? 'No transactions matched your search query.' : 'No commission payments have been logged yet.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop layout */}
                <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-xl shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Project / Lead</th>
                        <th className="py-3 px-4">Recipient (Payee)</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4">UTR Number</th>
                        <th className="py-3 px-4">Remark</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 text-xs">
                          <td className="py-3 px-4 font-semibold text-slate-600">{p.date}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{p.leadName}</div>
                            <div className="text-[10px] text-slate-400">{p.leadIdString}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">{p.payeeName}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                              {p.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">{p.paymentMode}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.utrNumber || '-'}</td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={p.remark}>{p.remark || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">₹{p.amount.toLocaleString()}</td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDeletePayment(p.entryId, p.id, p.amount)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                title="Delete this payment record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile layout */}
                <div className="block md:hidden space-y-3">
                  {filteredPayments.map((p) => (
                    <div key={p.id} className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-2 text-left relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-800 text-sm block">{p.leadName}</span>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 font-bold mt-1 inline-block">
                            {p.leadIdString}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block">{p.date}</span>
                          <span className="font-black text-emerald-600 text-sm block mt-0.5">₹{p.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Payee</span>
                          <span className="font-semibold text-slate-700">{p.payeeName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Role</span>
                          <span className="font-semibold text-slate-700">{p.role}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Mode</span>
                          <span className="font-semibold text-slate-700">{p.paymentMode}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">UTR No.</span>
                          <span className="font-mono text-slate-700">{p.utrNumber || '-'}</span>
                        </div>
                      </div>
                      {p.remark && (
                        <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-500 border border-slate-100">
                          <strong>Remark:</strong> {p.remark}
                        </div>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeletePayment(p.entryId, p.id, p.amount)}
                          className="absolute top-2 right-2 p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all"
                          title="Delete payment record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6 sm:mb-8 border-b border-slate-100 pb-6 sm:pb-8">
              <div className="space-y-1.5 w-full xl:max-w-xs">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Select {activeTab}
                </label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full px-4 sm:px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm cursor-pointer"
                >
                  <option value="">-- Choose {activeTab} --</option>
                  {activeRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPerson && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 p-3 sm:p-4 rounded-xl border border-slate-100 flex-1 w-full">
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                      Ledger Count
                    </span>
                    <span className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-800 block mt-1">
                      {stats.count} Configured
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                      Total Commission
                    </span>
                    <span className="text-sm sm:text-base lg:text-lg font-extrabold text-indigo-600 block mt-1">
                      ₹{stats.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                      Paid Commission
                    </span>
                    <span className="text-sm sm:text-base lg:text-lg font-extrabold text-emerald-600 block mt-1">
                      ₹{stats.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                      Due Commission
                    </span>
                    <span className="text-sm sm:text-base lg:text-lg font-extrabold text-rose-600 block mt-1">
                      ₹{stats.totalDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-16 sm:py-24 text-center">
                <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                <p className="text-xs sm:text-sm text-slate-400 font-bold">Synchronizing with ledger databases...</p>
              </div>
            ) : !selectedPerson ? (
              <div className="py-12 sm:py-16 text-center max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">Select {activeTab} Profile</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold mt-2 px-4">
                  Choose a registered {activeTab} member from the dropdown above to display their associated projects and calculate commissions.
                </p>
              </div>
            ) : associatedLeads.length === 0 ? (
              <div className="py-12 sm:py-16 text-center max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">No Associated Leads</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold mt-2 px-4">
                  We couldn't locate any projects assigned or linked to <strong className="text-slate-700">{selectedPerson?.name}</strong>. Assign this user to projects or leads in the workflow panel to establish mappings.
                </p>
              </div>
            ) : (
              <div>
                {/* Desktop / Tablet Table Layout */}
                <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-xl shadow-sm bg-white">
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                    <table className="w-full min-w-[1200px] table-fixed divide-y divide-slate-100 text-left border-collapse">
                      <colgroup>
                        <col className="w-[14%]" />
                        <col className="w-[7%]" />
                        <col className="w-[8%]" />
                        <col className="w-[8%]" />
                        <col className="w-[8%]" />
                        <col className="w-[8%]" />
                        <col className="w-[8%]" />
                        <col className="w-[10%]" />
                        <col className="w-[10%]" />
                        <col className="w-[10%]" />
                        <col className="w-[9%]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-left border-r border-slate-100">Project / Customer</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100">Project Value</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100 text-[10px] leading-tight font-medium text-slate-600">Amount Received</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100 text-[10px] leading-tight font-medium text-slate-600">Due Amount</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100 text-[10px] font-medium leading-tight">Base Rate (from Project Details)</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100 text-[10px] font-medium leading-tight">Discount (from Project Details)</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100">Commission</th>
                          <th scope="col" className="sticky top-0 bg-emerald-50 text-emerald-800/90 py-2 px-2 z-10 text-right border-r border-emerald-100 font-semibold shadow-[inset_0_-2px_0_#10b981] text-[10px] leading-tight">Commission After Discount</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right border-r border-slate-100">Paid Commission</th>
                          <th scope="col" className="sticky top-0 bg-rose-50 text-rose-800/90 py-2 px-2 z-10 text-right border-r border-rose-100 font-semibold shadow-[inset_0_-2px_0_#f43f5e]">Due Commission</th>
                          <th scope="col" className="sticky top-0 bg-slate-50 py-2 px-2 z-10 text-right">Act</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {associatedLeads.map((lead, index) => {
                          const savedEntry = commissionEntries.find(
                            entry => entry.leadId === lead.id && entry.role === activeTab
                          );
                          
                          return (
                            <CommissionRow
                              key={lead.id}
                              layout="desktop"
                              lead={lead}
                              person={selectedPerson}
                              role={activeTab as CommissionRoleType}
                              savedEntry={savedEntry}
                              onSave={handleSaveCommission}
                              onDelete={handleDeleteCommission}
                              onValueChange={handleRowValueChange}
                              isEven={index % 2 === 0}
                              isAdmin={isAdmin}
                              onPay={setPayModalData}
                              onLeadSelect={onLeadSelect}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards Stack Layout */}
                <div className="block md:hidden space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                  {associatedLeads.map((lead, index) => {
                    const savedEntry = commissionEntries.find(
                      entry => entry.leadId === lead.id && entry.role === activeTab
                    );
                    
                    return (
                      <CommissionRow
                        key={lead.id}
                        layout="mobile"
                        lead={lead}
                        person={selectedPerson}
                        role={activeTab as CommissionRoleType}
                        savedEntry={savedEntry}
                        onSave={handleSaveCommission}
                        onDelete={handleDeleteCommission}
                        onValueChange={handleRowValueChange}
                        isEven={index % 2 === 0}
                        isAdmin={isAdmin}
                        onPay={setPayModalData}
                        onLeadSelect={onLeadSelect}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Commission Payout Form Popover/Modal */}
      <AnimatePresence>
        {payModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPayModalData(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left z-10"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base">Record Commission Payment</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Disburse rewards and log payout transaction details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayModalData(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content Wrapper */}
              <PaymentForm
                payModalData={payModalData}
                onClose={() => setPayModalData(null)}
                onSave={async (details) => {
                  await handleSavePayment(
                    payModalData.lead,
                    payModalData.role,
                    payModalData.person,
                    payModalData.savedEntry,
                    details
                  );
                  setPayModalData(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface PaymentFormProps {
  payModalData: {
    lead: Lead;
    role: CommissionRoleType;
    person: CommissionRole;
    savedEntry: CommissionEntry | undefined;
  };
  onClose: () => void;
  onSave: (details: {
    amount: number;
    date: string;
    paymentMode: string;
    utrNumber: string;
    remark: string;
  }) => Promise<void>;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ payModalData, onClose, onSave }) => {
  const { lead, role, person, savedEntry } = payModalData;

  const projectValue = useMemo(() => {
    return Number(lead.finalRate || lead.originalRate || 0);
  }, [lead]);

  const baseRate = useMemo(() => {
    return Number(lead.originalRate || 0);
  }, [lead]);

  const discount = useMemo(() => {
    return Number(lead.discount || 0);
  }, [lead]);

  const calculatedCommission = useMemo(() => {
    if (!person) return 0;
    if (role === 'Lead Creator') {
      const kw = parseFloat(lead.finalKw || lead.requiredKw || "0") || 0;
      return Math.round(kw * (person.ratePerKw || 0));
    } else {
      if (person.rateType === 'flat') {
        return person.rateValue || 0;
      } else {
        return Math.round(baseRate * ((person.rateValue || 0) / 100));
      }
    }
  }, [role, person, lead, baseRate]);

  const commissionAfterDiscount = useMemo(() => {
    return role === 'Lead Creator' ? calculatedCommission : (calculatedCommission - discount);
  }, [calculatedCommission, discount, role]);

  const paidAmount = useMemo(() => {
    return savedEntry?.paidAmount ?? 0;
  }, [savedEntry]);

  const dueCommission = useMemo(() => {
    return Math.max(0, commissionAfterDiscount - paidAmount);
  }, [commissionAfterDiscount, paidAmount]);

  const [amount, setAmount] = useState<number>(dueCommission);
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave({
        amount,
        date,
        paymentMode,
        utrNumber: utrNumber.trim(),
        remark: remark.trim()
      });
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving the payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Payee and Lead info banner */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2 text-[11px] text-slate-600">
        <div className="flex justify-between">
          <span className="font-bold uppercase tracking-wider text-slate-400">Project Name:</span>
          <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate" title={lead.customerName}>
            {lead.customerName} ({lead.leadId})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold uppercase tracking-wider text-slate-400">Payee (Recipient):</span>
          <span className="font-bold text-slate-800">{person.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold uppercase tracking-wider text-slate-400">Designation / Role:</span>
          <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">{role}</span>
        </div>
        <div className="border-t border-slate-200/60 pt-2 flex justify-between text-xs">
          <span className="font-extrabold text-slate-500">Remaining Due Commission:</span>
          <span className="font-black text-rose-600">₹{dueCommission.toLocaleString()}</span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
          Payout Amount (₹) <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
          <input
            type="number"
            min="1"
            max={dueCommission || undefined}
            required
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-bold text-sm text-slate-800"
            placeholder="Enter disbursement amount"
          />
        </div>
        {dueCommission > 0 && amount > dueCommission && (
          <p className="text-[10px] font-semibold text-amber-600">Warning: Entered amount exceeds the remaining due balance of ₹{dueCommission.toLocaleString()}.</p>
        )}
      </div>

      {/* Date & Mode Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Payment Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-xs text-slate-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Payment Mode <span className="text-rose-500">*</span>
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-xs text-slate-700 cursor-pointer"
          >
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>

      {/* UTR Number */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
          UTR / Transaction Ref Number
        </label>
        <input
          type="text"
          value={utrNumber}
          onChange={(e) => setUtrNumber(e.target.value)}
          placeholder="e.g. Bank Ref No., IMPS/NEFT Ref"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-mono text-xs text-slate-700"
        />
      </div>

      {/* Remark */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
          Payment Remark / Note
        </label>
        <textarea
          rows={2}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Add transfer summary, approvals, etc."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100/30 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-xs text-slate-700 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || amount <= 0}
          className={`flex-1 py-3 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
            isSubmitting || amount <= 0
              ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-600'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Disburse & Save'
          )}
        </button>
      </div>
    </form>
  );
};

// Row Component for Precision State Management
interface CommissionRowProps {
  layout?: 'desktop' | 'mobile';
  lead: Lead;
  person: CommissionRole;
  role: CommissionRoleType;
  savedEntry: CommissionEntry | undefined;
  onSave: (entry: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onValueChange: (leadId: string, values: {
    projectValue: number;
    amountReceived: number;
    dueAmount: number;
    finalAmount: number;
    paidAmount: number;
    dueCommission: number;
  }) => void;
  isEven: boolean;
  isAdmin?: boolean;
  onPay?: (data: { lead: Lead; role: CommissionRoleType; person: CommissionRole; savedEntry: CommissionEntry | undefined }) => void;
  onLeadSelect?: (leadId: string) => void;
}

const CommissionRow: React.FC<CommissionRowProps> = ({
  layout = 'desktop',
  lead,
  person,
  role,
  savedEntry,
  onSave,
  onDelete,
  onValueChange,
  isEven,
  isAdmin = false,
  onPay,
  onLeadSelect
}) => {
  const projectValue = useMemo(() => {
    return Number(lead.finalRate || lead.originalRate || 0);
  }, [lead]);

  const baseRate = useMemo(() => {
    return Number(lead.originalRate || 0);
  }, [lead]);

  const discount = useMemo(() => {
    return Number(lead.discount || 0);
  }, [lead]);

  const calculatedCommission = useMemo(() => {
    if (!person) return 0;
    if (role === 'Lead Creator') {
      const kw = parseFloat(lead.finalKw || lead.requiredKw || "0") || 0;
      return Math.round(kw * (person.ratePerKw || 0));
    } else {
      if (person.rateType === 'flat') {
        return person.rateValue || 0;
      } else {
        return Math.round(baseRate * ((person.rateValue || 0) / 100));
      }
    }
  }, [role, person, lead, baseRate]);

  const commissionAfterDiscount = useMemo(() => {
    return role === 'Lead Creator' ? calculatedCommission : (calculatedCommission - discount);
  }, [calculatedCommission, discount, role]);

  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Sync state with savedEntry
  useEffect(() => {
    if (savedEntry) {
      setPaidAmount(savedEntry.paidAmount ?? 0);
    } else {
      setPaidAmount(0);
    }
  }, [savedEntry]);

  const dueCommission = useMemo(() => {
    return commissionAfterDiscount - paidAmount;
  }, [commissionAfterDiscount, paidAmount]);

  // Report real-time values to parent
  useEffect(() => {
    onValueChange(lead.id, {
      projectValue,
      amountReceived: Number(lead.payment_receivedAmount || 0),
      dueAmount: Math.max(0, projectValue - Number(lead.payment_receivedAmount || 0)),
      finalAmount: commissionAfterDiscount,
      paidAmount,
      dueCommission
    });
  }, [lead.id, projectValue, lead.payment_receivedAmount, commissionAfterDiscount, paidAmount, dueCommission, onValueChange]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        leadId: lead.id,
        leadIdString: lead.leadId,
        leadName: lead.customerName,
        projectValue,
        role,
        personId: person.id || '',
        personName: person.name,
        commissionType: person.role === 'Lead Creator' ? 'manual' : (person.rateType || 'percentage'),
        percentageValue: person.role !== 'Lead Creator' && person.rateType === 'percentage' ? (person.rateValue || 0) : 0,
        manualAmount: person.role === 'Lead Creator' ? (person.ratePerKw || 0) : (person.rateType === 'flat' ? (person.rateValue || 0) : 0),
        finalAmount: commissionAfterDiscount,
        paidAmount
      });
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save commission ledger entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!savedEntry?.id) return;
    setIsSaving(true);
    try {
      await onDelete(savedEntry.id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete commission ledger entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!savedEntry) return paidAmount > 0;
    return (savedEntry.paidAmount ?? 0) !== paidAmount || savedEntry.finalAmount !== commissionAfterDiscount;
  }, [savedEntry, paidAmount, commissionAfterDiscount]);

  const renderBreakdown = (positionClass: string) => {
    const kw = parseFloat(lead.finalKw || lead.requiredKw || "0") || 0;
    return (
      <div className={`absolute ${positionClass} w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 z-50 hidden group-hover:block text-left pointer-events-none`}>
        <h4 className="font-bold text-slate-100 text-[10px] uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">Calculation Breakdown</h4>
        <div className="space-y-1.5 text-[10px] font-medium">
          {role === 'Lead Creator' ? (
            <>
              <div className="flex justify-between text-slate-300">
                <span>Project Capacity:</span>
                <span className="text-slate-100">{kw} kW</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Commission Rate:</span>
                <span className="text-slate-100">₹{(person.ratePerKw || 0).toLocaleString()}/kW</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-1 mt-1 text-slate-200">
                <span className="font-bold text-white">Final Amount:</span>
                <span className="font-bold text-emerald-400">₹{commissionAfterDiscount.toLocaleString()}</span>
              </div>
              <div className="text-[9px] text-slate-400 italic mt-1 leading-tight">Discount does not apply to Lead Creator.</div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-300">
                <span>Project Value:</span>
                <span className="text-slate-100">₹{baseRate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Commission Rate:</span>
                <span className="text-slate-100">
                  {person.rateType === 'flat' ? `₹${(person.rateValue || 0).toLocaleString()} (Flat)` : `${person.rateValue || 0}%`}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Calculated Amount:</span>
                <span className="text-slate-100">₹{calculatedCommission.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>Discount Deduction:</span>
                <span className="font-bold">-₹{discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-1 mt-1 text-slate-200">
                <span className="font-bold text-white">Final Amount:</span>
                <span className="font-bold text-emerald-400">₹{commissionAfterDiscount.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (layout === 'mobile') {
    return (
      <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm space-y-3 relative text-left">
        {/* Header containing customer info & lead details */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <button 
              onClick={() => onLeadSelect?.(lead.id)}
              className="font-bold text-slate-800 hover:text-indigo-600 hover:underline text-sm truncate block w-full text-left transition-colors" 
              title={lead.customerName}
            >
              {lead.customerName}
            </button>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100/50">
                {lead.leadId}
              </span>
              {lead.status && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border truncate block ${
                  lead.status.toLowerCase().includes('won')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60'
                    : lead.status.toLowerCase().includes('lost')
                    ? 'bg-rose-50 text-rose-700 border-rose-100/60'
                    : 'bg-amber-50 text-amber-700 border-amber-100/60'
                }`} title={lead.status}>
                  {lead.status}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && onPay && (
              <button
                type="button"
                onClick={() => onPay({ lead, role, person, savedEntry })}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-505 border border-indigo-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1"
                title="Process Payout"
              >
                <Coins className="w-3.5 h-3.5" />
                Pay
              </button>
            )}

            {savedEntry && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all"
                title="Clear entry from ledger"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                !hasChanges
                  ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white shadow-xs'
              }`}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>

        {/* Financial Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 py-2.5 border-t border-b border-slate-100 text-[11px]">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Project Value</span>
            <span className="font-semibold text-slate-700 block mt-0.5">₹{projectValue.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Base Rate</span>
            <span className="font-semibold text-slate-700 block mt-0.5">₹{baseRate.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Amount Received</span>
            <span className="font-semibold text-slate-700 block mt-0.5">₹{(lead.payment_receivedAmount || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Due Amount</span>
            <span className="font-semibold text-rose-600 block mt-0.5">₹{((projectValue || 0) - (lead.payment_receivedAmount || 0)).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Discount</span>
            <span className="font-semibold text-slate-700 block mt-0.5">₹{discount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Commission</span>
            <span className="font-semibold text-slate-700 block mt-0.5">₹{calculatedCommission.toLocaleString()}</span>
          </div>
          <div className="col-span-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/50 mt-1 relative group">
            <div className="flex justify-between items-center cursor-help">
              <span className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1 tracking-wider">
                Comm After Discount
                <Info className="w-3 h-3 text-emerald-600/60" />
              </span>
              <span className="font-black text-emerald-700 text-xs">₹{commissionAfterDiscount.toLocaleString()}</span>
            </div>
            {renderBreakdown("bottom-full right-0 mb-2")}
          </div>
        </div>

        {/* Paid and Due Inputs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60 max-w-[135px]">
            <span className="text-slate-400 font-bold text-[10px]">Paid: ₹</span>
            <input
              type="number"
              value={paidAmount || ''}
              readOnly
              className="w-full bg-transparent focus:outline-none text-right text-[11px] font-bold text-slate-700 cursor-default"
            />
          </div>

          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Due Commission</span>
            <span className={`text-xs font-black block mt-0.5 ${dueCommission > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              ₹{dueCommission.toLocaleString()}
            </span>
          </div>
        </div>

        {showSavedToast && (
          <span className="absolute top-2 right-2 text-[9px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-100 shadow-sm z-20">
            Synced!
          </span>
        )}
      </div>
    );
  }

  return (
    <tr className={`hover:bg-indigo-50/10 transition-colors border-b border-slate-100 ${isEven ? 'bg-slate-50/30' : 'bg-white'}`}>
      <td className="py-1.5 px-2 text-left text-[11px] font-medium border-r border-slate-100/50">
        <div className="flex flex-col min-w-0">
          <button 
            onClick={() => onLeadSelect?.(lead.id)}
            className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline text-[11px] truncate block w-full text-left transition-colors" 
            title={lead.customerName}
          >
            {lead.customerName}
          </button>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/60 px-1.5 py-0.2 rounded border border-indigo-100/50">
              {lead.leadId}
            </span>
            {lead.status && (
              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full border truncate block max-w-[85px] ${
                lead.status.toLowerCase().includes('won')
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60'
                  : lead.status.toLowerCase().includes('lost')
                  ? 'bg-rose-50 text-rose-700 border-rose-100/60'
                  : 'bg-amber-50 text-amber-700 border-amber-100/60'
              }`} title={lead.status}>
                {lead.status}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-slate-700 border-r border-slate-100/50">
        ₹{projectValue.toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-slate-700 border-r border-slate-100/50">
        ₹{(lead.payment_receivedAmount || 0).toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-rose-600 border-r border-slate-100/50">
        ₹{((projectValue || 0) - (lead.payment_receivedAmount || 0)).toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-slate-700 border-r border-slate-100/50">
        ₹{baseRate.toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-slate-700 border-r border-slate-100/50">
        ₹{discount.toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-bold text-slate-700 border-r border-slate-100/50">
        ₹{calculatedCommission.toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right text-[11px] font-bold text-emerald-700 bg-emerald-50/10 border-r border-slate-100/50 relative group">
        <div className="flex items-center justify-end gap-1 cursor-help">
          ₹{commissionAfterDiscount.toLocaleString()}
          <Info className="w-3.5 h-3.5 text-emerald-600/60" />
        </div>
        {renderBreakdown("right-full top-1/2 -translate-y-1/2 mr-2")}
      </td>
      <td className="py-1.5 px-2 text-right border-r border-slate-100/50">
        <div className="flex items-center justify-end gap-0.5 max-w-[80px] ml-auto">
          <span className="text-slate-400 font-medium text-[11px]">₹</span>
          <input
            type="number"
            value={paidAmount || ''}
            readOnly
            className="w-[60px] bg-slate-50 border border-slate-200 px-1 py-0.5 text-right text-[11px] font-semibold rounded outline-none cursor-default"
          />
        </div>
      </td>
      <td className={`py-1.5 px-2 text-right text-[11px] font-bold border-r border-slate-100/50 transition-colors ${dueCommission > 0 ? 'bg-rose-50/20 text-rose-600' : 'text-slate-500'}`}>
        ₹{dueCommission.toLocaleString()}
      </td>
      <td className="py-1.5 px-2 text-right relative">
        <div className="flex items-center justify-end gap-1.5">
          {isAdmin && onPay && (
            <button
              type="button"
              onClick={() => onPay({ lead, role, person, savedEntry })}
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-600 text-white rounded text-[10px] font-bold transition-all shadow-xs flex items-center gap-0.5"
              title="Process Payout"
            >
              <Coins className="w-2.5 h-2.5" />
              Pay
            </button>
          )}

          {savedEntry && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded transition-all"
              title="Clear entry from ledger"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
              !hasChanges
                ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white shadow-xs'
            }`}
            title={savedEntry ? (hasChanges ? 'Update Ledger' : 'Saved to Ledger') : 'Save to Ledger'}
          >
            {isSaving ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              'Save'
            )}
          </button>
        </div>
        
        {/* Row-level save indicators */}
        <AnimatePresence>
          {showSavedToast && (
            <motion.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              className="absolute block text-[9px] font-black text-emerald-600 -mt-1 right-2 bg-white px-1 py-0.2 rounded border border-emerald-100 shadow-sm z-20"
            >
              Synced!
            </motion.span>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
};
