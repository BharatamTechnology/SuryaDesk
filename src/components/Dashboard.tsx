import { useState, useEffect, MouseEvent } from "react";
import { leadService } from "../services/leadService";
import { userService } from "../services/userService";
import { settingsService } from "../services/settingsService";
import { Lead, AppUser, Tab, StepDeadlineConfig } from "../types";
import { countWorkingDays } from "../utils/dateUtils";
import { formatCreatorName } from "../utils/creatorUtils";
import { format } from "date-fns";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Loader2,
  ChevronRight,
  Plus,
  AlertCircle,
  TrendingUp,
  ClipboardList,
  Sparkles,
  Zap,
  Calendar,
  ArrowRight,
  Bell,
  Download
} from "lucide-react";
import { motion } from "motion/react";
import { User } from "firebase/auth";

const parseToDateObj = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  if (typeof val?.toDate === 'function') {
    return val.toDate();
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return new Date();
    return d;
  } catch {
    return new Date();
  }
};

interface DashboardProps {
  user: User | null;
  role: AppUser['role'] | null;
  onSelectLead: (id: string, stepId?: number, tab?: Tab) => void;
  onNewLead: () => void;
  searchQuery?: string;
}

export default function Dashboard({ user, role, onSelectLead, onNewLead, searchQuery = "" }: DashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deadlines, setDeadlines] = useState<StepDeadlineConfig>({});
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'all' | 'assigned' | 'created'>(
    (role === 'Admin' || user?.email === 'hemant.tyagi@bharatamtechnology.com') ? 'all' : 'assigned'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const config = await settingsService.getSettings();
        if (config.stepDeadlines) {
          setDeadlines(config.stepDeadlines);
        }
      } catch (e) {
        console.error("Failed to load global settings", e);
      }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    const unsubscribeUsers = userService.subscribeToUsers((data) => {
      setUsers(data || []);
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    console.log("Dashboard: Subscribing to leads for", user?.email, "with role", role);
    setLoading(true);
    const unsubscribe = leadService.subscribeToLeads(role, user?.email, (data) => {
      console.log("Dashboard: Realtime update received. Loaded", data?.length, "leads");
      setLeads(data as unknown as Lead[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  const normalizedUserEmail = user?.email?.toLowerCase().trim();
  const isAdminUser = role === 'Admin' || normalizedUserEmail === 'hemant.tyagi@bharatamtechnology.com';

    const SEQUENCE = [
    { emailField: 'assignedPreSales', nameField: 'assignedPreSalesName', submitField: 'isPreSalesSubmitted', label: 'Pre-Sales', tab: 'pre_sales' },
    { emailField: 'assignedTo', nameField: 'assignedToName', submitField: 'isSurveySubmitted', label: 'Section B: Site Survey', tab: 'survey' },
    { emailField: 'assignedSalesEmail', nameField: 'assignedSalesName', submitField: 'isSalesSubmitted', label: 'Section C: Sales Follow-up', tab: 'sales' },
    { emailField: 'projectAssigneeEmail', nameField: 'projectAssignee', submitField: 'isFinancialsSubmitted', label: 'Section D: Project Details', tab: 'financials' },
    { emailField: 'accAssigneeEmail', nameField: 'accAssignee', submitField: 'isAccountsSubmitted', label: 'Section G: Account Confirmation', tab: 'accounts' },
    { emailField: 's_newConn_assignedToEmail', nameField: 's_newConn_assignedTo', submitField: 'isStep14Submitted', condition: (l) => l.newConnectionRequired === 'Yes', label: 'Step 1: New Connection', tab: 'execution', stepId: 14 },
    { emailField: 's_docCorr_assignedToEmail', nameField: 's_docCorr_assignedTo', submitField: 'isStep1Submitted', condition: (l) => l.s_docCorr_required === 'Yes', label: 'Step 2: Doc Correction', tab: 'execution', stepId: 1 },
    { emailField: 's_loadExt_assignedToEmail', nameField: 's_loadExt_assignedTo', submitField: 'isStep2Submitted', condition: (l) => l.loadExtensionRequired === 'Yes', label: 'Step 3: Load Extension', tab: 'execution', stepId: 2 },
    { emailField: 'execution_assignedToEmail', nameField: 'execution_assignedTo', submitField: 'isStep3Submitted', label: 'Step 4: Online Reg', tab: 'execution', stepId: 3 },
    { emailField: 's4_loanAssignedToEmail', nameField: 's4_loanAssignedTo', submitField: 'isStep4Submitted', condition: (l) => l.loanRequired === 'Yes', label: 'Step 5: Loan Process', tab: 'execution', stepId: 4 },
    { emailField: 's5_storeDispatchAssignedToEmail', nameField: 's5_storeDispatchAssignedTo', submitField: 'isStep5Submitted', label: 'Step 6: Meter Dispatch', tab: 'execution', stepId: 5 },
    { emailField: 's5_discomPreAssignedToEmail', nameField: 's5_discomPreAssignedTo', submitField: 'isStep6Submitted', label: 'Step 7: Discom Pre-Install', tab: 'execution', stepId: 6 },
    { emailField: 's6_inchargeAssignedToEmail', nameField: 's6_inchargeAssignedTo', submitField: 'isStep7Submitted', label: 'Step 8: Site Incharge', tab: 'execution', stepId: 7 },
    { emailField: 's5_storeInchargeAssignedToEmail', nameField: 's5_storeInchargeAssignedTo', submitField: 'isStep8Submitted', label: 'Step 9: Store Incharge', tab: 'execution', stepId: 8 },
    { emailField: 's6_assignedToEmail', nameField: 's6_assignedTo', submitField: 'isStep9Submitted', label: 'Step 10: Site Team', tab: 'execution', stepId: 9 },
    { emailField: 's7_assignedToEmail', nameField: 's7_assignedTo', submitField: 'isStep10Submitted', label: 'Step 11: Office Exec', tab: 'execution', stepId: 10 },
    { emailField: 's8_assignedToEmail', nameField: 's8_assignedTo', submitField: 'isStep11Submitted', label: 'Step 12: Discom Post-Install', tab: 'execution', stepId: 11 },
    { emailField: 's9_assignedToEmail', nameField: 's9_assignedTo', submitField: 'isStep12Submitted', condition: (l: any) => l.loanRequired === 'Yes', label: 'Step 13: Loan Final', tab: 'execution', stepId: 12 },
    { emailField: 's11_assignedToEmail', nameField: 's11_assignedTo', submitField: 'isStep13Submitted', label: 'Step 14: Subsidy', tab: 'execution', stepId: 13 },
    { emailField: 'projectInchargeEmail', nameField: 'projectInchargeName', submitField: 'isExecutionSubmitted', label: 'Final Execution Review', tab: 'project_incharge' }
  ];

  
  const getPendingActionName = (l: any) => {
    // No pending actions for terminal states (Lost, Converted, or Completed)
    if (l.status === 'Lost' || l.status === 'Converted' || l.status === 'Completed') return null;

    const hasReachedFurtherSteps = l.status === 'Won';

    let currentStepIndex = SEQUENCE.findIndex((step, index) => {
      // If we haven't reached 'Won' status, we should only consider pre-won steps (index 0, 1 and 2: Pre-Sales, Survey and Sales)
      if (!hasReachedFurtherSteps && index >= 3) return false;
      
      // If we have reached 'Won' status, we start from 'Project Details' (index 3 onwards)
      if (hasReachedFurtherSteps && index < 3) return false;

      if (step.condition && !step.condition(l)) return false; 
      return !(l as any)[step.submitField];
    });

    if (currentStepIndex !== -1) {
      const currentStep = SEQUENCE[currentStepIndex];
      let assignedEmail = (l as any)[currentStep.emailField];
      let displayLabel = currentStep.label;
      let displayTab = (currentStep as any).tab;
      let displayStepId = (currentStep as any).stepId;

      if (l.isAccountsSubmitted && currentStep.tab === 'execution' && !assignedEmail && (l.projectInchargeEmail || l.projectAssigneeEmail)) {
        assignedEmail = l.projectInchargeEmail || l.projectAssigneeEmail;
        displayLabel = 'Project Control';
        displayTab = 'project_incharge';
        displayStepId = undefined;
      }

      const isMine = typeof assignedEmail === 'string' && assignedEmail.toLowerCase().trim() === normalizedUserEmail;
      
      // Get assignment date - try specific field, then stepAssignmentDates, then updatedAt
      let dateValue = l.updatedAt;
      if (l.stepAssignmentDates && l.stepAssignmentDates[displayLabel]) {
        dateValue = l.stepAssignmentDates[displayLabel];
      }

      // Calculate Due Date
      let dueDate = null;
      if (displayLabel === 'Section B: Site Survey') {
        dueDate = l.siteVisitDate || l.planSiteVisitDate;
      } else if (displayLabel === 'Section C: Sales Follow-up') {
        dueDate = l.nextFollowUpDate;
      }

      // Default to assignment date + 1 day if no specific due date is found
      if (!dueDate) {
        const baseDate = dateValue ? (dateValue.seconds ? new Date(dateValue.seconds * 1000) : new Date(dateValue)) : new Date();
        const nextDay = new Date(baseDate);
        nextDay.setDate(nextDay.getDate() + 1);
        dueDate = nextDay;
      }

      // For Admin, show the action even if not assigned to them, but mark it differently
      if (isMine) return { label: displayLabel, isMine: true, date: dateValue, dueDate, tab: displayTab, stepId: displayStepId };
      if (isAdminUser) return { label: displayLabel, isMine: false, date: dateValue, dueDate, tab: displayTab, stepId: displayStepId };
    }
    return null;
  };

  const getLeadSelfStatus = (l: any) => {
    if (l.status === 'Lost' || l.status === 'Converted' || l.status === 'Completed') return null;

    const action = getPendingActionName(l);
    if (action?.isMine) {
      return { label: action.label, type: 'pending' as const };
    }

    // Check if I have completed any task and have no more pending
    const mySteps = SEQUENCE.filter(step => {
      const assignedEmail = (l as any)[step.emailField];
      return typeof assignedEmail === 'string' && assignedEmail.toLowerCase().trim() === normalizedUserEmail;
    });

    if (mySteps.length > 0) {
      const allDone = mySteps.every(step => (l as any)[step.submitField]);
      if (allDone) {
        return { label: 'My Tasks Finished', type: 'completed' as const };
      }
    }

    return action ? { label: action.label, type: 'others' as const } : null;
  };

  const getUserDisplayName = (email: string, storedName?: string) => {
    if (!email) return storedName || 'Unassigned';
    
    const emailLower = email.toLowerCase().trim();

    // 1. Look up in the subscribed users database supporting both email and id/uid matches
    const foundUser = users.find(u => {
      const uEmail = u.email ? u.email.toLowerCase().trim() : '';
      const uId = u.id ? u.id.toLowerCase().trim() : '';
      if (uEmail === emailLower || uId === emailLower) return true;
      if (uEmail.split('@')[0] === emailLower) return true;
      return false;
    });

    if (foundUser && foundUser.name) {
      return foundUser.name;
    }

    // 2. Fallback to storedName if it exists and is clean (not an email or username string or default split)
    if (storedName && storedName.trim() && !storedName.includes('@') && storedName !== email.split('@')[0]) {
      return storedName;
    }

    // 3. Fallback to current logged-in user if email matches
    if (user?.email && user.email.toLowerCase().trim() === email.toLowerCase().trim() && user.displayName) {
      return user.displayName;
    }

    // 4. Seeded specific emails / fallback match for clean view
    const prefixLower = emailLower.split('@')[0];
    if (prefixLower === 'hemanttyagi225' || prefixLower === 'hemant.tyagi' || prefixLower === 'hemanttyagi' || emailLower === 'hemant.tyagi@bharatamtechnology.com') {
      return 'Hemant Tyagi';
    }
    if (prefixLower === 'sitvik24') {
      return 'Sitvik';
    }
    if (prefixLower === 'kishanlalmeena.admin' || prefixLower === 'kishanlalmeena') {
      return 'Kishan Lal Meena';
    }
    if (prefixLower === 'pawanchaudharyaaaa051' || prefixLower === 'pawanchaudhary') {
      return 'Pawan Kumar';
    }
    if (prefixLower === 'rahulnagarwal366' || prefixLower === 'rahulnagarwal') {
      return 'Rahul Nagarwal';
    }
    if (prefixLower === '76513vk' || prefixLower === '76513') {
      return 'Vishnu Kumar Sharma';
    }
    if (prefixLower === 'anmolrathi20' || prefixLower === 'anmolrathi') {
      return 'Anmol Rathi';
    }
    if (prefixLower === 'gajendrameena3164' || prefixLower === 'gajendrameena') {
      return 'Gajendra Meena';
    }
    if (prefixLower === 'nm8877485' || prefixLower === 'nm8877') {
      return 'Nitesh';
    }

    // 5. Clean up the email prefix to nice Title Case
    const cleanName = prefixLower
      .replace(/[._-]/g, ' ')
      .replace(/([a-z])([0-9])/g, '$1 $2') // put space between letters and numbers
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return cleanName || 'Unassigned';
  };

  const getLeadTimingStatus = (l: any) => {
    // If no deadlines configured, or lead is closed/lost
    if (Object.keys(deadlines).length === 0) return null;
    if (l.status === 'Lost') return null;

    let isDelayed = false;

    // Check all steps we have tracking arrays for
    // Only steps 1 through 14 have stepAssignmentDates in execution block
    const assignments = l.stepAssignmentDates || {};
    const completions = l.stepCompletionDates || {};
    
    // We check steps using SEQUENCE, matching stepId
    for (const step of SEQUENCE) {
      if (step.stepId && deadlines[step.stepId] !== undefined) {
        const allowedDays = deadlines[step.stepId];
        
        let startIso = assignments[step.stepId] || assignments[step.label];
        if (!startIso) continue; // Not assigned yet

        let endIso = completions[step.stepId] || completions[step.label] || new Date().toISOString();
        
        const workingDaysUsed = countWorkingDays(startIso, endIso);
        
        if (workingDaysUsed > allowedDays) {
          isDelayed = true;
          break; // Stop at first delayed step to mark the lead as delayed
        }
      }
    }
    
    if (isDelayed) return 'Delayed';
    return Object.keys(assignments).length > 0 ? 'On Time' : null;
  };

  const getGeneralActiveStep = (l: any) => {
    if (l.status === 'Lost') return { label: 'Lead Closed', name: 'Lost / Closed', email: '' };
    if (l.status === 'Converted') return { label: 'Lead Converted', name: 'Approved', email: '' };
    if (l.status === 'Completed') return { label: 'Project Completed ✅', name: 'Verified & Closed', email: '' };

    const hasReachedFurtherSteps = l.status === 'Won';

    // Find first incomplete step in the entire sequence flow
    const currentStepIndex = SEQUENCE.findIndex((step, index) => {
      // If we haven't reached 'Won' status, we should only consider pre-won steps (index 0, 1 and 2: Pre-Sales, Survey and Sales)
      if (!hasReachedFurtherSteps && index >= 3) return false;
      
      // If we have reached 'Won' status, we start from 'Project Details' (index 3 onwards)
      if (hasReachedFurtherSteps && index < 3) return false;

      if (step.condition && !step.condition(l)) return false; 
      return !(l as any)[step.submitField];
    });

    if (currentStepIndex !== -1) {
      const currentStep = SEQUENCE[currentStepIndex];
      const email = (l as any)[currentStep.emailField] || '';
      let name = (l as any)[currentStep.nameField] || '';

      if (l.isAccountsSubmitted && currentStep.tab === 'execution' && !email && (l.projectInchargeEmail || l.projectAssigneeEmail)) {
        const inchargeEmail = l.projectInchargeEmail || l.projectAssigneeEmail || "";
        const inchargeName = l.projectInchargeName || l.projectAssignee || "";
        return {
          label: 'Project Control',
          name: getUserDisplayName(inchargeEmail, inchargeName),
          email: inchargeEmail,
          isMine: typeof inchargeEmail === 'string' && inchargeEmail.toLowerCase().trim() === normalizedUserEmail,
        };
      }

      name = getUserDisplayName(email, name);

      return {
        label: currentStep.label,
        name,
        email,
        isMine: typeof email === 'string' && email.toLowerCase().trim() === normalizedUserEmail,
      };
    }

    return { label: 'In Queue', name: 'Unassigned', email: '' };
  };

  const pendingActionData = leads.map(l => {
    const action = getPendingActionName(l);
    if (action?.isMine) {
      return { lead: l, action };
    }
    return null;
  }).filter(Boolean) as { lead: Lead, action: { label: string, isMine: boolean, date: any, dueDate: any, tab?: string, stepId?: number } }[];

  // Sort by Due Date: oldest (overdue) first
  const sortedPendingTasks = [...pendingActionData].sort((a, b) => {
    const getTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'string') return new Date(val).getTime();
      if (val instanceof Date) return val.getTime();
      if (val.seconds) return val.seconds * 1000;
      return 0;
    };
    return getTime(a.action.dueDate) - getTime(b.action.dueDate);
  });

  const pendingActionLeads = sortedPendingTasks.map(t => t.lead);

  const assignedLeads = leads.filter(l => 
    [...SEQUENCE.map(s => s.emailField), 'visitedByEmail', 'projectInchargeEmail', 'projectAssigneeEmail'].some(field => {
      const val = (l as any)[field];
      return typeof val === 'string' && val.toLowerCase().trim() === normalizedUserEmail;
    })
  );
  const createdLeads = leads.filter(l => l.createdBy?.toLowerCase().trim() === normalizedUserEmail);

  const leadsToFilter = isAdminUser
    ? (viewMode === 'all' ? leads : (viewMode === 'assigned' ? assignedLeads : createdLeads))
    : (viewMode === 'created' ? createdLeads : assignedLeads);

  const filteredLeads = leadsToFilter.filter(l => {
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      if (statusFilter === 'Under Discussion') {
        matchesStatus = l.status === 'Under Discussion' || l.status === 'Negotiation';
      } else if (statusFilter === 'Won') {
        matchesStatus = l.status === 'Won' || l.status === 'Converted';
      } else {
        matchesStatus = l.status === statusFilter;
      }
    }

    if (!matchesStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        (l.customerName || "").toLowerCase().includes(q) ||
        (l.id || "").toLowerCase().includes(q) ||
        (l.customerEmail || "").toLowerCase().includes(q) ||
        (l.mobileNumber || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = isAdminUser ? [
    { label: "Total Platform Leads", value: leads.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pipeline Progress", value: leads.filter(l => ['New', 'Under Discussion', 'Negotiation'].includes(l.status)).length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Conversions", value: leads.filter(l => l.status === 'Won' || l.status === 'Converted' || l.status === 'Completed').length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Closures", value: leads.filter(l => l.status === 'Lost').length, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  ] : [
    { label: "Total Asset Pool", value: leads.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Action Required", value: sortedPendingTasks.length, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Active Portfolio", value: assignedLeads.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Success Metric", value: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Won' || l.status === 'Converted' || l.status === 'Completed').length / leads.length) * 100) + '%' : '0%', icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const handleDeleteLead = async (e: MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete lead for "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(id);
      await leadService.deleteLead(id);
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Failed to delete lead. Please try again.");
    } finally {
      setIsDeleting(null);
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
    return <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="h-96 bg-slate-200 rounded-2xl" />
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Sleek Animated Lightweight Pill Button with Rose/Red Alert Theme */}
      {sortedPendingTasks.length > 0 && viewMode !== 'created' && (
        <div className="flex justify-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {/* Pulsing ambient outer glow aura */}
            <div className="absolute -inset-0.5 rounded-full bg-rose-500/20 blur-sm opacity-75 group-hover:opacity-100 animate-pulse pointer-events-none" />

            <motion.button
              animate={{ 
                y: [0, -4, 0],
              }}
              whileHover={{ 
                scale: 1.03,
                boxShadow: "0 10px 20px -6px rgba(225, 29, 72, 0.3)"
              }}
              whileTap={{ scale: 0.98 }}
              transition={{
                y: {
                  repeat: Infinity,
                  duration: 2.5,
                  ease: "easeInOut"
                }
              }}
              onClick={() => (window as any).setActiveTab?.('tasks')}
              className="group relative inline-flex items-center gap-3 pl-3.5 pr-4.5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white border border-rose-500 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer overflow-hidden shadow-md select-none"
            >
              {/* Sliding shine reflection sweep */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
                animate={{
                  x: ["-150%", "300%"]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.8,
                  ease: "easeInOut",
                  repeatDelay: 1.5
                }}
              />

              {/* Ringing Alarm Bell Icon */}
              <motion.div
                animate={{ 
                  rotate: [0, -12, 12, -10, 8, -4, 0]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  repeatDelay: 3,
                  ease: "easeInOut"
                }}
                className="relative flex items-center justify-center shrink-0"
              >
                <Bell className="w-4 h-4 fill-white/10" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              </motion.div>

              {/* Dynamic Notification Message */}
              <span className="font-extrabold tracking-widest text-white flex items-center gap-1.5 leading-none">
                {sortedPendingTasks.length} Pending Task{sortedPendingTasks.length > 1 ? 's' : ''}
              </span>

              {/* Arrow right indicator with hover shifting */}
              <div className="w-5 h-5 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-white transition-all duration-300 shrink-0">
                <ArrowRight className="w-3 h-3 transform transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 text-slate-800">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex items-start justify-between relative overflow-hidden group"
          >
            <div className="relative z-10 min-w-0">
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 truncate">{stat.label}</p>
              <h3 className="text-xl md:text-4xl font-display font-bold text-slate-900 leading-none">{stat.value}</h3>
            </div>
            <div className={`${stat.bg} p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm relative z-10 transition-transform group-hover:scale-110 duration-300`}>
              <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
            </div>
            <div className={`absolute -right-4 -bottom-4 w-16 md:w-24 h-16 md:h-24 rounded-full opacity-5 transition-transform group-hover:scale-150 duration-700 ${stat.bg}`} />
          </motion.div>
        ))}
      </div>

      {/* Leads Table Container */}
      <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-8 lg:p-10 border-b border-slate-50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8 mb-4 md:mb-10">
            <div>
              <h3 className="text-xl md:text-3xl font-display font-bold text-slate-900 tracking-tight leading-tight">Leads Ecosystem</h3>
              <p className="hidden sm:block text-xs md:text-sm text-slate-400 font-medium tracking-tight">Strategic overview of solar prospect pipeline.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl sm:rounded-2xl border border-slate-200">
                {isAdminUser && (
                  <button
                    onClick={() => { setViewMode('all'); setCurrentPage(1); }}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                      viewMode === 'all' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Full
                  </button>
                )}
                <button
                  onClick={() => { setViewMode('assigned'); setCurrentPage(1); }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                    viewMode === 'assigned' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Assigned
                </button>
                <button
                  onClick={() => { setViewMode('created'); setCurrentPage(1); }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                    viewMode === 'created' 
                    ? 'bg-white text-amber-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  My Leads
                </button>
              </div>
              
              <button
                onClick={() => {
                  try {
                    if (!filteredLeads.length) return;
                    
                    const headers = ['Ref', 'Prospect Name', 'Email', 'Mobile', 'City', 'Status', 'Creator', 'Created At', 'Tech Specs (KW)', 'Final KW', 'Current Step', 'Current Owner'];
                    const escapeCell = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
                    
                    const rows = filteredLeads.map(l => {
                      const activeStep = getGeneralActiveStep(l);
                      return [
                        l.id,
                        l.customerName || '',
                        l.customerEmail || '',
                        l.mobileNumber || '',
                        l.city || '',
                        l.status || '',
                        l.createdBy || '',
                        l.createdAt || '',
                        l.requiredKw || '',
                        l.finalKw || '',
                        activeStep.label || '',
                        activeStep.name || ''
                      ];
                    });
                    
                    const csvContent = "data:text/csv;charset=utf-8," + [
                      headers.map(escapeCell).join(','),
                      ...rows.map(row => row.map(escapeCell).join(','))
                    ].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `Leads_Export_${new Date().getTime()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (err) {
                    console.error("Export failed", err);
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-all"
                title="Download CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button 
                onClick={onNewLead}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-zinc-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-zinc-800 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                New Pipeline Lead
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['All', 'New', 'Under Discussion', 'Won', 'Completed', 'Lost'].map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                    statusFilter === status 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-4 md:px-8 py-4">Prospect</th>
                <th className="px-4 md:px-8 py-4">Creator</th>
                <th className="px-4 md:px-8 py-4">Status</th>
                <th className="px-8 py-4">Tech Specs</th>
                <th className="px-8 py-4">Current Step & Owner</th>
                <th className="px-8 py-4">Timeline</th>
                <th className="px-4 md:px-8 py-4">Reference</th>
                <th className="px-4 md:px-8 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {paginatedLeads.map((lead) => {
                const selfStatus = getLeadSelfStatus(lead);
                const isPending = selfStatus?.type === 'pending';
                const generalActiveStep = getGeneralActiveStep(lead);
                const timingStatus = getLeadTimingStatus(lead);

                // Calculate elapsed/going days since creation
                const isClosed = ['Completed', 'Lost'].includes(lead.status);
                const startDate = parseToDateObj(lead.createdAt);
                const endDate = isClosed ? parseToDateObj(lead.updatedAt) : new Date();
                const msDiff = endDate.getTime() - startDate.getTime();
                const goingDays = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));

                // Sum all SLA step deadlines configuration
                const totalAllowedDays: number = Object.values(deadlines).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) as number;
                
                return (
                  <tr 
                    key={lead.id} 
                    onClick={() => onSelectLead(lead.id)}
                    className={`${isPending ? 'bg-indigo-50/40 shadow-[inset_4px_0_0_0_#4f46e5]' : 'hover:bg-slate-50/80'} cursor-pointer transition-all border-b border-slate-100 last:border-0`}
                  >
                    <td className="px-4 md:px-8 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs md:text-sm font-bold truncate max-w-[120px] md:max-w-none ${isPending ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {lead.customerName}
                          </span>
                          {isPending && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                        </div>
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-bold tracking-wider">{lead.mobileNumber}</span>
                        {generalActiveStep && (
                          <div className="md:hidden mt-2 flex flex-wrap items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-700 truncate" title={generalActiveStep.label}>
                              {generalActiveStep.label}
                            </span>
                            <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50/60 px-1 py-0.5 rounded border border-indigo-100/50 truncate max-w-[80px]" title={generalActiveStep.name}>
                              {generalActiveStep.name}
                            </span>
                          </div>
                        )}
                        {selfStatus && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              selfStatus.type === 'pending' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 
                              selfStatus.type === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {selfStatus.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] md:max-w-none">
                          {formatCreatorName(lead.createdByName, lead.createdBy)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Creator</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4">
                      <div className="block">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${
                          lead.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                          lead.status === 'Won' || lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          lead.status === 'Lost' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          lead.status === 'Under Discussion' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                           <span className={`w-1 h-1 rounded-full mr-1.5 ${
                            lead.status === 'Completed' ? 'bg-indigo-500' :
                            lead.status === 'Won' || lead.status === 'Converted' ? 'bg-emerald-500' :
                            lead.status === 'Lost' ? 'bg-rose-500' :
                            lead.status === 'Under Discussion' ? 'bg-emerald-500' :
                            'bg-blue-500'
                          }`} />
                          {lead.status === 'Won' ? 'WON' : lead.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{lead.requiredKw || '--'} KW</span>
                        <span className="text-[10px] text-slate-400 font-medium">Solar Plant</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      {generalActiveStep ? (
                        <div className="flex flex-col gap-1 max-w-[180px]">
                          <span className="text-xs font-semibold text-slate-700 leading-none truncate" title={generalActiveStep.label}>
                            {generalActiveStep.label}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-[18px] h-[18px] rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                              {generalActiveStep.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 truncate" title={generalActiveStep.name}>
                              {generalActiveStep.name}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-600">{lead.updatedAt?.seconds ? format(new Date(lead.updatedAt.seconds * 1000), 'MMM d') : 'N/A'}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Updated</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold truncate max-w-[120px] md:max-w-none ${lead.reference ? 'text-slate-700' : 'text-slate-400/80'}`}>
                          {lead.reference || 'NA'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Reference</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isAdminUser && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLead(e, lead.id, lead.customerName); }}
                            disabled={isDeleting === lead.id}
                            className="p-1.5 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all flex items-center justify-center"
                          >
                            {isDeleting === lead.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <span className="p-1.5 text-slate-300 group-hover:text-slate-900 group-hover:bg-slate-100 rounded-md transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedLeads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                        {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} leads found` : 'No leads found in this view'}
                      </p>
                      <button 
                        onClick={() => { setStatusFilter('All'); setViewMode(isAdminUser ? 'all' : 'assigned'); }}
                        className="mt-6 text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
                      >
                        Clear Filters / Show All
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Processing {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} Global Entries
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-white disabled:opacity-30 transition-all shadow-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all shadow-sm ${
                      currentPage === i + 1 
                      ? 'bg-emerald-500 text-white scale-110 shadow-lg' 
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-white disabled:opacity-30 transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
