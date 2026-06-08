import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { leadService } from "../services/leadService";
import { paymentService } from "../services/paymentService";
import { userService } from "../services/userService";
import { Lead, AppUser, Tab, PaymentRecord } from "../types";
import { format } from "date-fns";
import { 
  ClipboardList, 
  Calendar, 
  User as UserIcon,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface TaskSheetProps {
  user: User | null;
  role: AppUser['role'] | null;
  onSelectTask: (leadId: string, stepId?: number, tab?: Tab) => void;
}

export default function TaskSheet({ user, role, onSelectTask }: TaskSheetProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const unsub = userService.subscribeToUsers((data) => {
      setUsers(data || []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.email) {
      const docRef = doc(db, "users", user.email);
      getDoc(docRef).then((snap) => {
        if (snap.exists()) {
          setDbUser(snap.data() as AppUser);
        }
      }).catch(err => {
        console.error("Error fetching db user info in TaskSheet:", err);
      });
    }
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'mine' | 'all' | 'incharge'>(role === 'Admin' ? 'all' : 'mine');
  const [selectedLeadId, setSelectedLeadId] = useState<string>("all");

  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [selectedPaymentTask, setSelectedPaymentTask] = useState<PaymentRecord | null>(null);

  // For modal form editing
  const [editAmount, setEditAmount] = useState("");
  const [editUtr, setEditUtr] = useState("");
  const [editType, setEditType] = useState<PaymentRecord['paymentType']>("Advance");
  const [editDate, setEditDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPaymentTask) {
      setEditAmount(String(selectedPaymentTask.amount));
      setEditUtr(selectedPaymentTask.utrNo || "");
      setEditType(selectedPaymentTask.paymentType || "Advance");
      setEditDate(selectedPaymentTask.date || new Date().toISOString().split('T')[0]);
      setEditRemarks(selectedPaymentTask.remarks || "");
      setConfirmError(null);
    }
  }, [selectedPaymentTask]);

  useEffect(() => {
    setSelectedLeadId("all");
  }, [viewMode]);

  const SEQUENCE = [
    { emailField: 'assignedPreSales', nameField: 'assignedPreSalesName', submitField: 'isPreSalesSubmitted', label: 'Pre-Sales', tab: 'pre_sales' },
    { emailField: 'assignedTo', nameField: 'assignedToName', submitField: 'isSurveySubmitted', label: 'Section B: Site Survey', tab: 'survey' },
    { emailField: 'assignedSalesEmail', nameField: 'assignedSalesName', submitField: 'isSalesSubmitted', label: 'Section C: Sales Follow-up', tab: 'sales' },
    { emailField: 'projectAssigneeEmail', nameField: 'projectAssignee', submitField: 'isFinancialsSubmitted', label: 'Section D: Project Details', tab: 'financials' },
    { emailField: 'accAssigneeEmail', nameField: 'accAssignee', submitField: 'isAccountsSubmitted', label: 'Section G: Account Confirmation', tab: 'accounts' },
    { emailField: 's_docCorr_assignedToEmail', nameField: 's_docCorr_assignedTo', submitField: 'isStep1Submitted', condition: (l: any) => l.s_docCorr_required === 'Yes', label: 'Step 1: Doc Correction', tab: 'execution', stepId: 1 },
    { emailField: 's_loadExt_assignedToEmail', nameField: 's_loadExt_assignedTo', submitField: 'isStep2Submitted', condition: (l: any) => l.loadExtensionRequired === 'Yes', label: 'Step 2: Load Extension', tab: 'execution', stepId: 2 },
    { emailField: 'execution_assignedToEmail', nameField: 'execution_assignedTo', submitField: 'isStep3Submitted', label: 'Step 3: Online Reg', tab: 'execution', stepId: 3 },
    { emailField: 's4_loanAssignedToEmail', nameField: 's4_loanAssignedTo', submitField: 'isStep4Submitted', condition: (l: any) => l.loanRequired === 'Yes', label: 'Step 4: Loan Process', tab: 'execution', stepId: 4 },
    { emailField: 's5_storeDispatchAssignedToEmail', nameField: 's5_storeDispatchAssignedTo', submitField: 'isStep5Submitted', label: 'Step 5: Meter Dispatch', tab: 'execution', stepId: 5 },
    { emailField: 's5_discomPreAssignedToEmail', nameField: 's5_discomPreAssignedTo', submitField: 'isStep6Submitted', label: 'Step 6: Discom Pre-Install', tab: 'execution', stepId: 6 },
    { emailField: 's6_inchargeAssignedToEmail', nameField: 's6_inchargeAssignedTo', submitField: 'isStep7Submitted', label: 'Step 7: Site Incharge', tab: 'execution', stepId: 7 },
    { emailField: 's5_storeInchargeAssignedToEmail', nameField: 's5_storeInchargeAssignedTo', submitField: 'isStep8Submitted', label: 'Step 8: Store Incharge', tab: 'execution', stepId: 8 },
    { emailField: 's6_assignedToEmail', nameField: 's6_assignedTo', submitField: 'isStep9Submitted', label: 'Step 9: Site Team', tab: 'execution', stepId: 9 },
    { emailField: 's7_assignedToEmail', nameField: 's7_assignedTo', submitField: 'isStep10Submitted', label: 'Step 10: Office Exec', tab: 'execution', stepId: 10 },
    { emailField: 's8_assignedToEmail', nameField: 's8_assignedTo', submitField: 'isStep11Submitted', label: 'Step 11: Discom Post-Install', tab: 'execution', stepId: 11 },
    { emailField: 's9_assignedToEmail', nameField: 's9_assignedTo', submitField: 'isStep12Submitted', label: 'Step 12: Loan Final', tab: 'execution', stepId: 12 },
    { emailField: 's11_assignedToEmail', nameField: 's11_assignedTo', submitField: 'isStep13Submitted', label: 'Step 13: Subsidy', tab: 'execution', stepId: 13 },
    { emailField: 'projectInchargeEmail', nameField: 'projectInchargeName', submitField: 'isExecutionSubmitted', label: 'Final Execution Review', tab: 'project_incharge' }
  ];

  useEffect(() => {
    setLoading(true);
    const unsubscribeLeads = leadService.subscribeToLeads(role, user?.email, (data) => {
      setLeads(data as unknown as Lead[]);
    });

    const unsubscribePayments = paymentService.subscribeToPendingPayments((pymts) => {
      setPendingPayments(pymts || []);
    });

    setLoading(false);

    return () => {
      unsubscribeLeads();
      unsubscribePayments();
    };
  }, [user, role]);

  const normalizedUserEmail = user?.email?.toLowerCase().trim();

  const isPymtMine = (p: PaymentRecord, associatedLead?: Lead) => {
    const email = user?.email?.toLowerCase().trim();
    const dbUserName = dbUser?.name?.toLowerCase().trim();
    const displayName = user?.displayName?.toLowerCase().trim();
    const assignee = p.confirmationAssignee?.toLowerCase().trim();

    // If there is an associated lead, and the logged-in user is the assigned accountant of that lead, it is mine!
    if (associatedLead) {
      const leadAccEmail = associatedLead.accAssigneeEmail?.toLowerCase().trim();
      const leadAccName = associatedLead.accAssignee?.toLowerCase().trim();
      if (email && leadAccEmail === email) {
        return true;
      }
      if (dbUserName && leadAccName === dbUserName) {
        return true;
      }
      if (displayName && leadAccName === displayName) {
        return true;
      }
    }

    if (!assignee) return false;

    // 1. Direct name matches (e.g., "Test User", "Sitvik", "Anmol Rathi")
    if (dbUserName && assignee === dbUserName) {
      return true;
    }
    if (displayName && assignee === displayName) {
      return true;
    }

    // 2. Dynamic matching using live users list from Settings
    let matchedUserByCollection = users.find(u => u.name.toLowerCase().trim() === assignee);
    if (!matchedUserByCollection) {
      matchedUserByCollection = users.find(u => {
        const uName = u.name.toLowerCase().trim();
        return uName.includes(assignee) || assignee.includes(uName);
      });
    }
    if (matchedUserByCollection && email && matchedUserByCollection.email.toLowerCase().trim() === email) {
      return true;
    }

    // 3. Fallback and custom triggers
    if (assignee === 'admin' && (role === 'Admin' || email === 'hemant.tyagi@bharatamtechnology.com')) {
      return true;
    }
    if ((assignee === 'sitvik' || assignee === 'sitvik (admin)' || assignee === 'satvik') && (email === 'sitvik24@gmail.com' || dbUserName?.includes('sitvik') || dbUserName?.includes('satvik'))) {
      return true;
    }
    if (assignee === 'sitvik (admin)' && role === 'Admin') {
      return true;
    }
    if (assignee === 'anmol rathi' && (email === 'anmolrathi20@gmail.com' || dbUserName === 'anmol rathi')) {
      return true;
    }
    if (assignee === 'test user' && (
      email === 'hemant.tyagi@bharatamtechnology.com' || 
      email === 'testuser@example.com' || 
      email?.includes('testuser') || 
      dbUserName === 'test user' || 
      role === 'Admin'
    )) {
      return true;
    }
    return false;
  };

  const getPendingTasks = () => {
    const leadTasks = leads.map(l => {
      if (l.status === 'Lost' || l.status === 'Converted' || l.status === 'Completed') return null;
      
      const hasReachedFurtherSteps = l.status === 'Won';

      const currentSteps = SEQUENCE.filter((step, index) => {
        if (!hasReachedFurtherSteps && index >= 3) return false;
        if (hasReachedFurtherSteps && index < 3) return false;
        if (step.condition && !step.condition(l)) return false;
        
        const assignedEmail = (l as any)[step.emailField];
        const assignedName = (l as any)[step.nameField];
        const isMine = typeof assignedEmail === 'string' && assignedEmail.toLowerCase().trim() === normalizedUserEmail;
        const isSubmitted = (l as any)[step.submitField];

        // If viewMode is 'mine', only show my tasks
        // If viewMode is 'incharge', show tasks for the Project Incharge (Oversight + Unassigned Execution steps)
        // If viewMode is 'all' (Admin only), show all assigned tasks that aren't submitted
        const isProjectInchargeOfThisLead = typeof l.projectInchargeEmail === 'string' && l.projectInchargeEmail.toLowerCase().trim() === normalizedUserEmail;

        if (viewMode === 'mine') {
          return isMine && !isSubmitted;
        } 
        
        if (viewMode === 'incharge') {
          const isLeadUnderMyIncharge = isProjectInchargeOfThisLead || role === 'Admin';
          if (!isLeadUnderMyIncharge) return false;

          // Show only Project Control execution steps (steps 1-14), excluding Oversight
          const isProjectControlExecutionStep = step.tab === 'execution';
          return isProjectControlExecutionStep && !!assignedEmail && !isSubmitted;
        }

        if (viewMode === 'all') {
          return !!assignedEmail && !isSubmitted;
        }

        return false;
      });

      return currentSteps.map(step => {
        let dateValue = l.updatedAt;
        if (l.stepAssignmentDates && l.stepAssignmentDates[step.label]) {
          dateValue = l.stepAssignmentDates[step.label];
        }

        const assignedEmail = (l as any)[step.emailField];
        const displayLabel = step.label;

        let dueDate = null;
        if (step.label === 'Section B: Site Survey') {
          dueDate = l.siteVisitDate || l.planSiteVisitDate;
        } else if (step.label === 'Section C: Sales Follow-up') {
          dueDate = l.nextFollowUpDate;
        } else if (step.stepId && l.stepDueDates && l.stepDueDates[step.stepId]) {
          dueDate = l.stepDueDates[step.stepId];
        }

        if (!dueDate) {
          const baseDate = dateValue ? (dateValue.seconds ? new Date(dateValue.seconds * 1000) : new Date(dateValue)) : new Date();
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + 1);
          dueDate = nextDay;
        }

        return {
          lead: l,
          label: displayLabel,
          tab: step.tab as Tab,
          stepId: step.stepId,
          assignedDate: dateValue,
          dueDate: dueDate,
          assigneeName: (l as any)[step.nameField] || 'Unassigned',
          assigneeEmail: assignedEmail || '',
          isMine: typeof (assignedEmail) === 'string' && assignedEmail.toLowerCase().trim() === normalizedUserEmail,
          isPaymentTask: false
        };
      });
    }).flat().filter(Boolean);

    const paymentTasks = pendingPayments.map(p => {
      const associatedLead = leads.find(l => l.id === p.leadId);
      if (!associatedLead) return null;

      let visible = false;
      
      // Hide legacy duplicate advance payment tasks if the lead handles it in Section G
      // This prevents the duplicate task where both Section G and Payment task are created
      if (p.paymentType === 'Advance' && (associatedLead.accAssignee || associatedLead.accAssigneeEmail)) {
        return null;
      }
      
      if (viewMode === 'mine') {
        visible = isPymtMine(p, associatedLead);
      } else if (viewMode === 'all') {
        visible = true; // Admin sees all
      } else if (viewMode === 'incharge') {
        visible = isPymtMine(p, associatedLead);
      }

      if (!visible) return null;

      const createdDate = p.recordedAt ? (p.recordedAt.seconds ? new Date(p.recordedAt.seconds * 1000) : new Date(p.recordedAt)) : new Date();

      let assigneeEmail = p.recordedBy || '';
      const assigneeLower = (p.confirmationAssignee || '').toLowerCase().trim();
      if (assigneeLower) {
        // 1. Dynamic check in live users collection from Settings tab
        let matchedUser = users.find(u => u.name.toLowerCase().trim() === assigneeLower);
        if (!matchedUser) {
          matchedUser = users.find(u => {
            const uName = u.name.toLowerCase().trim();
            return uName.includes(assigneeLower) || assigneeLower.includes(uName);
          });
        }
        
        if (matchedUser) {
          assigneeEmail = matchedUser.email;
        } else if (associatedLead && associatedLead.accAssignee?.toLowerCase().trim() === assigneeLower) {
          assigneeEmail = associatedLead.accAssigneeEmail || assigneeEmail;
        } else if (assigneeLower === 'sitvik' || assigneeLower === 'sitvik (admin)' || assigneeLower === 'satvik') {
          assigneeEmail = 'sitvik24@gmail.com';
        } else if (assigneeLower === 'anmol rathi') {
          assigneeEmail = 'anmolrathi20@gmail.com';
        } else if (assigneeLower === 'admin') {
          assigneeEmail = 'hemant.tyagi@bharatamtechnology.com';
        }
      }

      return {
        lead: associatedLead,
        label: p.paymentType === 'Other' ? `Confirm Payment: Other (₹${p.amount.toLocaleString()})` : `Confirm ${p.paymentType} Payment (₹${p.amount.toLocaleString()})`,
        tab: 'accounts' as Tab,
        payment: p,
        assignedDate: p.recordedAt,
        dueDate: createdDate,
        assigneeName: p.confirmationAssignee || 'Unassigned',
        assigneeEmail: assigneeEmail,
        isMine: isPymtMine(p, associatedLead),
        isPaymentTask: true
      };
    }).filter(Boolean);

    return [...leadTasks, ...paymentTasks] as { 
      lead: Lead, 
      label: string, 
      tab: Tab, 
      stepId?: number, 
      assignedDate: any, 
      dueDate: any,
      assigneeName: string,
      assigneeEmail: string,
      isMine: boolean,
      isPaymentTask?: boolean,
      payment?: PaymentRecord
    }[];
  };

  const allInchargePendingTasks = getPendingTasks();
  
  const inchargeLeads = leads.filter(l => {
    if (l.status === 'Lost' || l.status === 'Converted' || l.status === 'Completed') return false;
    const isProjectInchargeOfThisLead = typeof l.projectInchargeEmail === 'string' && l.projectInchargeEmail.toLowerCase().trim() === normalizedUserEmail;
    return isProjectInchargeOfThisLead || role === 'Admin';
  });

  const pendingTasks = (viewMode === 'incharge' && selectedLeadId !== 'all')
    ? allInchargePendingTasks.filter(t => t.lead.id === selectedLeadId)
    : allInchargePendingTasks;
  
  const stats = {
    total: pendingTasks.length,
    overdue: pendingTasks.filter(t => new Date(t.dueDate).getTime() < new Date().getTime()).length,
    dueToday: pendingTasks.filter(t => {
      const today = new Date();
      const dueDate = new Date(t.dueDate);
      return dueDate.getDate() === today.getDate() && 
             dueDate.getMonth() === today.getMonth() && 
             dueDate.getFullYear() === today.getFullYear() &&
             new Date(t.dueDate).getTime() >= new Date().getTime();
    }).length
  };

  const filteredTasks = pendingTasks.filter(t => 
    t.lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.lead.leadId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.assigneeEmail.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const getTime = (val: any) => {
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      if (typeof val === 'string') return new Date(val).getTime();
      if (val.seconds) return val.seconds * 1000;
      return 0;
    };
    return getTime(a.dueDate) - getTime(b.dueDate);
  });

  const handleApprovePaymentTask = async () => {
    if (!selectedPaymentTask) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      await paymentService.confirmPayment(selectedPaymentTask.id, {
        amount: parseFloat(editAmount),
        utrNo: editUtr,
        paymentType: editType,
        date: editDate,
        remarks: editRemarks
      });
      setSelectedPaymentTask(null);
    } catch (err: any) {
      console.error(err);
      setConfirmError(err.message || "Failed to confirm payment entry.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRejectPaymentTask = async () => {
    if (!selectedPaymentTask) return;
    if (!window.confirm("Are you sure you want to REJECT this payment entry?")) {
      return;
    }
    setIsConfirming(true);
    setConfirmError(null);
    try {
      await paymentService.rejectPayment(selectedPaymentTask.id);
      setSelectedPaymentTask(null);
    } catch (err: any) {
      console.error(err);
      setConfirmError(err.message || "Failed to reject payment entry.");
    } finally {
      setIsConfirming(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    try {
      const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            Operational Task Sheet
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mt-3">
            <p className="text-sm font-medium text-slate-500 max-w-sm">
              {viewMode === 'mine' ? 'Real-time queue of all activities assigned to you.' : 
               viewMode === 'incharge' ? 'Operational roadmap oversight for your assigned projects.' :
               'Unified view of all active employee tasks across the organization.'}
            </p>
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setViewMode('mine')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'mine' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                My Focus
              </button>
              <button 
                onClick={() => setViewMode('incharge')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'incharge' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Project Incharge
              </button>
              {role === 'Admin' && (
                <button 
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${viewMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Global Pipeline
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
             <div className="px-4 py-2 text-center border-r border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Total</p>
                <p className="text-lg font-black text-slate-900 leading-none">{stats.total}</p>
             </div>
             <div className="px-4 py-2 text-center border-r border-slate-100">
                <p className="text-[10px] font-black text-rose-400 uppercase leading-none mb-1">Overdue</p>
                <p className="text-lg font-black text-rose-600 leading-none">{stats.overdue}</p>
             </div>
             <div className="px-4 py-2 text-center">
                <p className="text-[10px] font-black text-amber-400 uppercase leading-none mb-1">Today</p>
                <p className="text-lg font-black text-amber-600 leading-none">{stats.dueToday}</p>
             </div>
          </div>

          {viewMode === 'incharge' && (
            <div className="relative w-full sm:w-64 group/select">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/select:text-indigo-600 transition-colors" />
              <select 
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full pl-9 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer shadow-sm focus:border-indigo-500"
              >
                <option value="all">All Projects ({inchargeLeads.length})</option>
                {inchargeLeads.map((l) => {
                  const leadPendingCount = allInchargePendingTasks.filter(t => t.lead.id === l.id).length;
                  return (
                    <option key={l.id} value={l.id}>
                      {l.customerName} ({leadPendingCount} pending)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within/select:rotate-180 transition-transform" />
            </div>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Filter tasks, owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity & Step</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</th>
                {(role === 'Admin' || viewMode === 'incharge') && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsibility</th>}
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadlines</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task, idx) => {
                    const dueDateObj = new Date(task.dueDate);
                    const isOverdue = dueDateObj.getTime() < new Date().getTime();
                    const isToday = dueDateObj.toDateString() === new Date().toDateString();

                    return (
                      <motion.tr 
                        key={`${task.lead.id}-${task.label}-${task.assigneeEmail}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group hover:bg-slate-50/80 transition-all"
                      >
                        <td className="px-8 py-6">
                          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border ${
                            isOverdue 
                              ? 'bg-rose-50 border-rose-100 text-rose-600' 
                              : isToday 
                                ? 'bg-amber-50 border-amber-100 text-amber-600'
                                : 'bg-翡翠-50 border-emerald-100 text-emerald-600'
                          }`}>
                            <span className="text-[10px] font-black uppercase leading-none mb-1">
                              {isOverdue ? 'LATE' : isToday ? 'NOW' : 'SOON'}
                            </span>
                            <span className="text-lg font-black leading-none">{dueDateObj.getDate()}</span>
                            <span className="text-[8px] font-black uppercase">{format(dueDateObj, 'MMM')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div>
                            <p className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{task.label}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-md tracking-tighter">
                                {task.tab.replace('_', ' ')}
                              </span>
                              {task.isPaymentTask && (
                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-md tracking-tighter">
                                  Confirmation Required
                                </span>
                              )}
                              {task.stepId && (
                                <span className="text-[10px] font-black text-slate-300">
                                  PHASE {task.stepId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{task.lead.customerName}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REF: {task.lead.leadId.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        {(role === 'Admin' || viewMode === 'incharge') && (
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900 leading-none mb-1">{task.assigneeName}</p>
                                <p className="text-[10px] font-bold text-slate-400">{task.assigneeEmail}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                             <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase">Assign: {formatDate(task.assignedDate)}</span>
                             </div>
                             <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-500' : 'text-slate-900'}`}>
                                <Clock className="w-3 h-3" />
                                <span className="text-xs font-black">Due: {formatDate(task.dueDate)}</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end">
                            {task.isMine ? (
                              <button 
                                onClick={() => {
                                  if (task.isPaymentTask) {
                                    setSelectedPaymentTask(task.payment || null);
                                  } else {
                                    onSelectTask(task.lead.id, task.stepId, task.tab);
                                  }
                                }}
                                className="flex items-center gap-2 pl-6 pr-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-95 bg-indigo-600 text-white hover:bg-zinc-900"
                              >
                                Execute Now
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/60 text-slate-400 text-[10px] font-black uppercase rounded-xl tracking-wider">
                                Assigned to {task.assigneeName}
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={role === 'Admin' ? 6 : 5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-10 h-10 text-indigo-200" />
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-900">Workspace Clear</p>
                          <p className="text-sm font-medium text-slate-500 mt-1 max-w-xs mx-auto">
                            All pending operational activities have been addressed. Check back later for new assignments.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Confirmation Modal Overlay */}
      <AnimatePresence>
        {selectedPaymentTask && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-950 text-white flex justify-between items-center bg-zinc-950">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Payment Confirmation Request</span>
                  <h3 className="text-xl font-black tracking-tight">{selectedPaymentTask.leadName}</h3>
                </div>
                <button 
                  onClick={() => setSelectedPaymentTask(null)}
                  className="text-slate-400 hover:text-white transition-colors text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-sans">
                {confirmError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {confirmError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Payment Type</label>
                    <select 
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-sans"
                    >
                      <option value="Advance">Advance</option>
                      <option value="Installment 1">Installment 1</option>
                      <option value="Installment 2">Installment 2</option>
                      <option value="Balance">Balance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Entry Date</label>
                    <input 
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Amount (INR)</label>
                  <input 
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">UTR / Transaction Reference</label>
                  <input 
                    type="text"
                    required
                    value={editUtr}
                    onChange={(e) => setEditUtr(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Original Notes / Remarks</label>
                  <textarea 
                    rows={3}
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none font-sans"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                  <button 
                    disabled={isConfirming}
                    onClick={handleRejectPaymentTask}
                    className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50 font-sans"
                  >
                    Reject Entry
                  </button>
                  <button 
                    disabled={isConfirming}
                    onClick={handleApprovePaymentTask}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1 font-sans"
                  >
                    {isConfirming ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Approve & Post'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
