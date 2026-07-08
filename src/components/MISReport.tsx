import { useState, useEffect, useMemo } from "react";
import { leadService } from "../services/leadService";
import { formatCreatorName } from "../utils/creatorUtils";
import { userService } from "../services/userService";
import { Lead, AppUser, Tab, ServiceRequest } from "../types";
import { serviceRequestService } from "../services/serviceRequestService";
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User as UserIcon, 
  Search, 
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  X,
  ChevronRight,
  Info,
  Sparkles,
  Filter,
  ArrowUpRight,
  Check,
  Briefcase,
  Users,
  CheckSquare,
  Layers3,
  Download
} from "lucide-react";
import { User } from "firebase/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import CapacityMIS from "./CapacityMIS";
import { AnimatePresence, motion } from "motion/react";

interface MISReportProps {
  user: User | null;
  role: AppUser['role'] | null;
  onSelectLead: (leadId: string, stepId?: number, tab?: Tab) => void;
}

interface WorkerScore {
  email: string;
  name: string;
  role: string | null;
  received: number;
  done: number;
  pending: number;
  delayed: number; 
  ontimeDone: number;
  delayDone: number;
  scorePercent: number;
}

interface MappedTask {
  id: string;
  lead: Lead;
  stepLabel: string;
  stepId?: number;
  tab: Tab;
  assigneeName: string;
  assigneeEmail: string;
  assignedDate: Date;
  dueDate: Date;
  completionDate: Date | null;
  isSubmitted: boolean;
  status: 'ontime' | 'delayed_done' | 'pending_ontrack' | 'pending_overdue';
}

const MetricCard = ({ title, count, subtitle, icon: Icon, onClick, color = "indigo" }: { title: string; count: number; subtitle: string; icon: any; onClick: () => void; color?: string }) => {
    const colorClasses: Record<string, { bg: string, text: string, hoverBorder: string }> = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hoverBorder: 'hover:border-indigo-300' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', hoverBorder: 'hover:border-blue-300' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', hoverBorder: 'hover:border-amber-300' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hoverBorder: 'hover:border-emerald-300' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', hoverBorder: 'hover:border-rose-300' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-600', hoverBorder: 'hover:border-teal-300' },
    };
    const c = colorClasses[color] || colorClasses.indigo;
    
    return (
        <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`bg-white hover:bg-slate-50 border border-slate-200/80 ${c.hoverBorder} rounded-3xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group`}
        >
            <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:${c.text} transition-colors`}>{title}</span>
                <div className={`w-8 h-8 rounded-xl ${c.bg} ${c.text} flex items-center justify-center font-bold`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div>
                <h2 className="text-3xl font-extrabold text-slate-800 leading-none mb-1 group-hover:text-slate-900 transition-colors">{count}</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">{subtitle}</p>
            </div>
        </motion.div>
    );
};

export default function MISReport({ user, role, onSelectLead }: MISReportProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<AppUser[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab switcher State (Executive MIS Summary vs Leaderboard & Productivity)
  const [activeTab, setActiveTab] = useState<'executive' | 'operations' | 'capacity'>(() => {
    return (sessionStorage.getItem('mis_activeTab') as 'executive' | 'operations' | 'capacity') || 'executive';
  });

  useEffect(() => {
    sessionStorage.setItem('mis_activeTab', activeTab);
  }, [activeTab]);
  
  // Executive MIS Range Selector (Daily, Weekly, Monthly, Custom)
  const [executivePeriod, setExecutivePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [executiveEmpEmail, setExecutiveEmpEmail] = useState<string>("all");
  const [execFromDate, setExecFromDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [execToDate, setExecToDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // Drill-down Modal state
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'leads' | 'tasks' | 'services';
    leadsList?: Lead[];
    tasksList?: MappedTask[];
    servicesList?: ServiceRequest[];
    metricKey?: string;
  }>({
    isOpen: false,
    title: "",
    type: "leads",
    leadsList: [],
    tasksList: [],
    servicesList: [],
    metricKey: ""
  });
  
  const [modalSearch, setModalSearch] = useState("");

  const [fromDate, setFromDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  
  const [selectedEmpEmail, setSelectedEmpEmail] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePeriodType, setActivePeriodType] = useState<string>("thismonth");
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState<string>("all");

  const SEQUENCE = [
    { emailField: 'assignedTo', nameField: 'assignedToName', submitField: 'isSurveySubmitted', label: 'Section B: Site Survey', tab: 'survey', key: 'survey' },
    { emailField: 'assignedSalesEmail', nameField: 'assignedSalesName', submitField: 'isSalesSubmitted', label: 'Section C: Sales Follow-up', tab: 'sales', key: 'sales' },
    { emailField: 'projectAssigneeEmail', nameField: 'projectAssignee', submitField: 'isFinancialsSubmitted', label: 'Section D: Project Details', tab: 'financials', key: 'financials' },
    { emailField: 'accAssigneeEmail', nameField: 'accAssignee', submitField: 'isAccountsSubmitted', label: 'Section G: Account Confirmation', tab: 'accounts', key: 'accounts' },
    { emailField: 's_newConn_assignedToEmail', nameField: 's_newConn_assignedTo', submitField: 'isStep14Submitted', condition: (l) => l.newConnectionRequired === 'Yes', label: 'Step 1: New Connection', tab: 'execution', stepId: 14, key: '14' },
    { emailField: 's_docCorr_assignedToEmail', nameField: 's_docCorr_assignedTo', submitField: 'isStep1Submitted', condition: (l) => l.s_docCorr_required === 'Yes', label: 'Step 2: Doc Correction', tab: 'execution', stepId: 1, key: '1' },
    { emailField: 's_loadExt_assignedToEmail', nameField: 's_loadExt_assignedTo', submitField: 'isStep2Submitted', condition: (l) => l.loadExtensionRequired === 'Yes', label: 'Step 3: Load Extension', tab: 'execution', stepId: 2, key: '2' },
    { emailField: 'execution_assignedToEmail', nameField: 'execution_assignedTo', submitField: 'isStep3Submitted', label: 'Step 4: Online Reg', tab: 'execution', stepId: 3, key: '3' },
    { emailField: 's4_loanAssignedToEmail', nameField: 's4_loanAssignedTo', submitField: 'isStep4Submitted', condition: (l) => l.loanRequired === 'Yes', label: 'Step 5: Loan Process', tab: 'execution', stepId: 4, key: '4' },
    { emailField: 's5_storeDispatchAssignedToEmail', nameField: 's5_storeDispatchAssignedTo', submitField: 'isStep5Submitted', label: 'Step 6: Meter Dispatch', tab: 'execution', stepId: 5, key: '5' },
    { emailField: 's5_discomPreAssignedToEmail', nameField: 's5_discomPreAssignedTo', submitField: 'isStep6Submitted', label: 'Step 7: Discom Pre-Install', tab: 'execution', stepId: 6, key: '6' },
    { emailField: 's6_inchargeAssignedToEmail', nameField: 's6_inchargeAssignedTo', submitField: 'isStep7Submitted', label: 'Step 8: Site Incharge', tab: 'execution', stepId: 7, key: '7' },
    { emailField: 's5_storeInchargeAssignedToEmail', nameField: 's5_storeInchargeAssignedTo', submitField: 'isStep8Submitted', label: 'Step 9: Store Incharge', tab: 'execution', stepId: 8, key: '8' },
    { emailField: 's6_assignedToEmail', nameField: 's6_assignedTo', submitField: 'isStep9Submitted', label: 'Step 10: Site Team', tab: 'execution', stepId: 9, key: '9' },
    { emailField: 's7_assignedToEmail', nameField: 's7_assignedTo', submitField: 'isStep10Submitted', label: 'Step 11: Office Exec', tab: 'execution', stepId: 10, key: '10' },
    { emailField: 's8_assignedToEmail', nameField: 's8_assignedTo', submitField: 'isStep11Submitted', label: 'Step 12: Discom Post-Install', tab: 'execution', stepId: 11, key: '11' },
    { emailField: 's9_assignedToEmail', nameField: 's9_assignedTo', submitField: 'isStep12Submitted', condition: (l: any) => l.loanRequired === 'Yes', label: 'Step 13: Loan Final', tab: 'execution', stepId: 12, key: '12' },
    { emailField: 's11_assignedToEmail', nameField: 's11_assignedTo', submitField: 'isStep13Submitted', label: 'Step 14: Subsidy', tab: 'execution', stepId: 13, key: '13' },
    { emailField: 's12_assignedToEmail', nameField: 's12_assignedTo', submitField: 'isStep15Submitted', label: 'Step 15: Insurance', tab: 'execution', stepId: 15, key: '15' },
    { emailField: 'projectInchargeEmail', nameField: 'projectInchargeName', submitField: 'isExecutionSubmitted', label: 'Final Execution Review', tab: 'project_incharge', key: 'execution_start' }
  ];

  useEffect(() => {
    setLoading(true);
    const unsubLeads = leadService.subscribeToLeads(role, user?.email, (data) => {
      setLeads(data as unknown as Lead[]);
    });

    const unsubUsers = userService.subscribeToUsers((data) => {
      // Safe guard against missing names
      const sorted = [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setEmployees(sorted);
      setLoading(false);
    });

    const normalizedEmail = (user?.email || "").toLowerCase().trim();
    const isAdminUser = role === "Admin" || normalizedEmail === "hemant.tyagi@bharatamtechnology.com";
    const unsubServices = serviceRequestService.subscribeToRequests(
      user?.email || "",
      isAdminUser,
      (data) => {
        setServiceRequests(data);
      }
    );

    return () => {
      unsubLeads();
      unsubUsers();
      unsubServices();
    };
  }, [user, role]);

  const rawUserEmail = user?.email || "";
  const normalizedUserEmail = rawUserEmail.toLowerCase().trim();
  const isAdmin = role === 'Admin' || normalizedUserEmail === 'hemant.tyagi@bharatamtechnology.com';

  const isUserEmailMatch = (assignee: string, targetEmail: string): boolean => {
    if (!assignee || !targetEmail) return false;
    const a = assignee.toLowerCase().trim();
    const t = targetEmail.toLowerCase().trim();
    if (a === t) return true;

    const aPrefix = a.split('@')[0];
    const tPrefix = t.split('@')[0];
    if (aPrefix === tPrefix) return true;
    return false;
  };

  const isLeadAssignedToUser = (l: Lead, email: string): boolean => {
    if (email === "all") return true;
    const lowerEmail = email.toLowerCase().trim();
    
    // Find the employee in the employees list to get their nice name
    const emp = employees.find(e => (e.email || "").toLowerCase().trim() === lowerEmail);
    const empName = emp?.name ? emp.name.toLowerCase().trim() : "";
    const emailPrefix = lowerEmail.split('@')[0];
    
    // Helper to check if a specific field matches this employee's details (email or name)
    const checkValue = (val: any): boolean => {
      if (!val || typeof val !== 'string') return false;
      const cleanVal = val.toLowerCase().trim();
      
      // 1. Literal email match
      if (cleanVal === lowerEmail) return true;
      
      // 2. Email prefix match (e.g. "hemant.tyagi" matches "hemant.tyagi@...")
      if (cleanVal === emailPrefix) return true;
      
      // 3. Name match (if cleanVal is a full name like "hemant tyagi" and matches empName)
      if (empName && cleanVal === empName) return true;
      
      // 4. Loose name match (e.g. "hemant" or "hemant.tyagi" containing the prefix/first name or last name)
      const normalizedCleanVal = cleanVal.replace(/[\s\._-]/g, "");
      const normalizedEmpName = empName ? empName.replace(/[\s\._-]/g, "") : "";
      const normalizedEmailPrefix = emailPrefix.replace(/[\s\._-]/g, "");
      
      if (normalizedEmpName && normalizedCleanVal === normalizedEmpName) return true;
      if (normalizedCleanVal === normalizedEmailPrefix) return true;
      
      return false;
    };

    // Check members array
    if (l.members && Array.isArray(l.members)) {
      if (l.members.some(m => checkValue(m))) return true;
    }
    
    // Check all fields of the lead
    const leadObj = l as any;
    const fieldsToCheck = [
      leadObj.createdBy,
      leadObj.createdByName,
      leadObj.assignedPreSales,
      leadObj.assignedPreSalesName,
      leadObj.assignedTo,
      leadObj.assignedToEmail,
      leadObj.assignedToName,
      leadObj.assignedSales,
      leadObj.assignedSalesEmail,
      leadObj.projectAssignee,
      leadObj.projectAssigneeEmail,
      leadObj.accAssignee,
      leadObj.accAssigneeEmail,
      leadObj.s_newConn_assignedTo,
      leadObj.s_newConn_assignedToEmail,
      leadObj.s_docCorr_assignedTo,
      leadObj.s_docCorr_assignedToEmail,
      leadObj.s_loadExt_assignedTo,
      leadObj.s_loadExt_assignedToEmail,
      leadObj.execution_assignedTo,
      leadObj.execution_assignedToEmail,
      leadObj.s6_assignedTo,
      leadObj.s6_assignedToEmail,
      leadObj.s7_assignedTo,
      leadObj.s7_assignedToEmail,
      leadObj.s8_assignedTo,
      leadObj.s8_assignedToEmail,
      leadObj.s9_assignedTo,
      leadObj.s9_assignedToEmail,
      leadObj.s10_assignedTo,
      leadObj.s10_assignedToEmail,
      leadObj.s11_assignedTo,
      leadObj.s11_assignedToEmail,
      leadObj.projectIncharge,
      leadObj.projectInchargeEmail
    ];

    return fieldsToCheck.some(field => checkValue(field));
  };

  const checkLeadValueForUser = (val: any, email: string): boolean => {
    if (email === "all") return true;
    if (!val || typeof val !== 'string') return false;
    const lowerEmail = email.toLowerCase().trim();
    const emp = employees.find(e => (e.email || "").toLowerCase().trim() === lowerEmail);
    const empName = emp?.name ? emp.name.toLowerCase().trim() : "";
    const emailPrefix = lowerEmail.split('@')[0];
    
    const cleanVal = val.toLowerCase().trim();
    
    // 1. Literal email match
    if (cleanVal === lowerEmail) return true;
    
    // 2. Email prefix match
    if (cleanVal === emailPrefix) return true;
    
    // 3. Name match
    if (empName && cleanVal === empName) return true;
    
    // 4. Loose match
    const normalizedCleanVal = cleanVal.replace(/[\s\._-]/g, "");
    const normalizedEmpName = empName ? empName.replace(/[\s\._-]/g, "") : "";
    const normalizedEmailPrefix = emailPrefix.replace(/[\s\._-]/g, "");
    
    if (normalizedEmpName && normalizedCleanVal === normalizedEmpName) return true;
    if (normalizedCleanVal === normalizedEmailPrefix) return true;
    
    return false;
  };

  const isLeadCreatedByUser = (l: Lead, email: string): boolean => {
    if (email === "all") return true;
    return checkLeadValueForUser(l.createdBy, email) || checkLeadValueForUser(l.createdByName, email);
  };

  const isLeadNewOrDiscussionAssignedToUser = (l: Lead, email: string): boolean => {
    if (email === "all") return true;
    const leadObj = l as any;
    const fieldsToCheck = [
      leadObj.assignedPreSales,
      leadObj.assignedPreSalesName,
      leadObj.assignedTo,
      leadObj.assignedToEmail,
      leadObj.assignedToName
    ];
    if (fieldsToCheck.some(field => checkLeadValueForUser(field, email))) return true;
    if (l.members && Array.isArray(l.members)) {
      if (l.members.some(m => checkLeadValueForUser(m, email))) return true;
    }
    return false;
  };

  const isLeadSalesAssignedToUser = (l: Lead, email: string): boolean => {
    if (email === "all") return true;
    const leadObj = l as any;
    const fieldsToCheck = [
      leadObj.assignedSales,
      leadObj.assignedSalesEmail
    ];
    return fieldsToCheck.some(field => checkLeadValueForUser(field, email));
  };

  const parseToDate = (val: any): Date => {
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

  const getMappedTasks = (): MappedTask[] => {
    const tasks: MappedTask[] = [];

    leads.forEach((l) => {
      SEQUENCE.forEach((step) => {
        if (step.condition && !step.condition(l)) return;

        const assigneeEmail = ((l as any)[step.emailField] || "").toLowerCase().trim();
        const assigneeName = (l as any)[step.nameField] || "Unassigned";

        if (!assigneeEmail) return;

        let assignedDateObj = parseToDate(l.createdAt);
        if (l.stepAssignmentDates && l.stepAssignmentDates[step.key]) {
          assignedDateObj = parseToDate(l.stepAssignmentDates[step.key]);
        } else if (l.stepAssignmentDates && l.stepAssignmentDates[step.label]) {
          assignedDateObj = parseToDate(l.stepAssignmentDates[step.label]);
        }

        const isSubmitted = !!(l as any)[step.submitField];
        let completionDateObj: Date | null = null;
        if (isSubmitted) {
          if (l.stepCompletionDates && l.stepCompletionDates[step.key]) {
            completionDateObj = parseToDate(l.stepCompletionDates[step.key]);
          } else if (l.stepCompletionDates && l.stepCompletionDates[step.label]) {
            completionDateObj = parseToDate(l.stepCompletionDates[step.label]);
          } else {
            completionDateObj = parseToDate(l.updatedAt || new Date());
          }
        }

        let dueDateObj: Date | null = null;
        if (step.label === 'Section B: Site Survey') {
          dueDateObj = l.siteVisitDate ? parseToDate(l.siteVisitDate) : (l.planSiteVisitDate ? parseToDate(l.planSiteVisitDate) : null);
        } else if (step.label === 'Section C: Sales Follow-up') {
          dueDateObj = l.nextFollowUpDate ? parseToDate(l.nextFollowUpDate) : null;
        } else if (step.stepId && l.stepDueDates && l.stepDueDates[step.stepId]) {
          dueDateObj = parseToDate(l.stepDueDates[step.stepId]);
        }

        if (!dueDateObj) {
          const copy = new Date(assignedDateObj.getTime());
          copy.setDate(copy.getDate() + 1);
          dueDateObj = copy;
        }

        let status: MappedTask['status'];
        if (isSubmitted) {
          const compTime = completionDateObj ? completionDateObj.getTime() : 0;
          const dueTime = dueDateObj.getTime();
          status = compTime <= dueTime ? 'ontime' : 'delayed_done';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDay = new Date(dueDateObj.getTime());
          dueDay.setHours(0, 0, 0, 0);
          status = today.getTime() <= dueDay.getTime() ? 'pending_ontrack' : 'pending_overdue';
        }

        tasks.push({
          id: `${l.id}-${step.label}`,
          lead: l,
          stepLabel: step.label,
          stepId: step.stepId,
          tab: step.tab as Tab,
          assigneeName,
          assigneeEmail,
          assignedDate: assignedDateObj,
          dueDate: dueDateObj,
          completionDate: completionDateObj,
          isSubmitted,
          status
        });
      });
    });

    return tasks;
  };

  const allMappedTasks = getMappedTasks();

  const parsedFromBoundary = new Date(fromDate + "T00:00:00");
  const parsedToBoundary = new Date(toDate + "T23:59:59");
  const safeFromBoundary = isNaN(parsedFromBoundary.getTime()) ? new Date(0) : parsedFromBoundary;
  const safeToBoundary = isNaN(parsedToBoundary.getTime()) ? new Date() : parsedToBoundary;

  const tasksInPeriod = allMappedTasks.filter((t) => {
    const tDate = t.assignedDate.getTime();
    return tDate >= safeFromBoundary.getTime() && tDate <= safeToBoundary.getTime();
  });

  const calculateEmployeeStats = (emailNormalized: string, name: string, employeeRole: string | null): WorkerScore => {
    const userTasks = tasksInPeriod.filter(t => isUserEmailMatch(t.assigneeEmail, emailNormalized));
    const received = userTasks.length;
    const done = userTasks.filter(t => t.isSubmitted).length;
    const pending = userTasks.filter(t => !t.isSubmitted).length;
    const delayed = userTasks.filter(t => t.status === 'pending_overdue').length;
    const ontimeDone = userTasks.filter(t => t.status === 'ontime').length;
    const delayDone = userTasks.filter(t => t.status === 'delayed_done').length;
    const scorePercent = received > 0 ? Math.round((done / received) * 100) : 0;

    return {
      email: emailNormalized,
      name,
      role: employeeRole,
      received,
      done,
      pending,
      delayed,
      ontimeDone,
      delayDone,
      scorePercent
    };
  };

  const allSubscribedEmails = Array.from(new Set([
    ...employees.map(e => (e.email || "").toLowerCase().trim()).filter(Boolean),
    ...allMappedTasks.map(t => (t.assigneeEmail || "").toLowerCase().trim()).filter(Boolean)
  ]));

  const employeeLeaderboard: WorkerScore[] = allSubscribedEmails.map(email => {
    const empRecord = employees.find(e => (e.email || "").toLowerCase().trim() === email);
    const name = empRecord ? empRecord.name : (allMappedTasks.find(t => isUserEmailMatch(t.assigneeEmail, email))?.assigneeName || email);
    const userRole = empRecord ? empRecord.role : "Executive";
    return calculateEmployeeStats(email, name, userRole);
  }).sort((a, b) => b.scorePercent - a.scorePercent || b.received - a.received);

  const visibleLeaderboard = useMemo(() => {
    if (!isAdmin) {
      return employeeLeaderboard.filter(emp => isUserEmailMatch(emp.email, normalizedUserEmail));
    }
    
    let list = employeeLeaderboard;
    if (selectedEmpEmail !== "all") {
      list = list.filter(emp => isUserEmailMatch(emp.email, selectedEmpEmail));
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(emp => emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q));
    }
    
    return list;
  }, [employeeLeaderboard, isAdmin, selectedEmpEmail, normalizedUserEmail, searchQuery]);

  const selectedUserTasks = useMemo(() => {
    const emailToFilter = isAdmin ? selectedEmpEmail : normalizedUserEmail;
    if (emailToFilter === "all") {
      return tasksInPeriod;
    } else {
      return tasksInPeriod.filter(t => isUserEmailMatch(t.assigneeEmail, emailToFilter));
    }
  }, [tasksInPeriod, selectedEmpEmail, isAdmin, normalizedUserEmail]);

  const filteredLedgerTasks = useMemo(() => {
    return selectedUserTasks.filter(t => {
      if (ledgerFilterStatus !== "all") {
        if (ledgerFilterStatus === "pending" && t.isSubmitted) return false;
        if (ledgerFilterStatus === "done" && !t.isSubmitted) return false;
        if (ledgerFilterStatus === "overdue" && t.status !== "pending_overdue") return false;
        if (ledgerFilterStatus === "ontime" && t.status !== "ontime") return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesCustomer = t.lead.customerName?.toLowerCase().includes(query);
        const matchesStep = t.stepLabel.toLowerCase().includes(query);
        return matchesCustomer || matchesStep;
      }
      return true;
    }).sort((a,b) => b.assignedDate.getTime() - a.assignedDate.getTime());
  }, [selectedUserTasks, ledgerFilterStatus, searchQuery]);

  const activeStats = (() => {
    if (!isAdmin) {
      const el = employeeLeaderboard.find(e => e.email === normalizedUserEmail);
      return el || calculateEmployeeStats(normalizedUserEmail, user?.displayName || "Emp", role);
    }

    if (selectedEmpEmail === "all") {
      const received = tasksInPeriod.length;
      const done = tasksInPeriod.filter(t => t.isSubmitted).length;
      const pending = tasksInPeriod.filter(t => !t.isSubmitted).length;
      const delayed = tasksInPeriod.filter(t => t.status === 'pending_overdue').length;
      const ontimeDone = tasksInPeriod.filter(t => t.status === 'ontime').length;
      const delayDone = tasksInPeriod.filter(t => t.status === 'delayed_done').length;
      const scorePercent = received > 0 ? Math.round((done / received) * 100) : 0;
      return { email: "all", name: "Company Consolidated", role: "All Employees", received, done, pending, delayed, ontimeDone, delayDone, scorePercent };
    }

    return employeeLeaderboard.find(el => el.email === selectedEmpEmail) || calculateEmployeeStats(selectedEmpEmail, "Selected Employee", "Contributor");
  })();

  const applyQuickPeriod = (type: string) => {
    const today = new Date();
    let from = today;
    let to = today;

    switch (type) {
      case 'thisweek':
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'lastweek': {
        const lastWeekDay = subWeeks(today, 1);
        from = startOfWeek(lastWeekDay, { weekStartsOn: 1 });
        to = endOfWeek(lastWeekDay, { weekStartsOn: 1 });
        break;
      }
      case 'thismonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'lastmonth': {
        const prevMonth = subMonths(today, 1);
        from = startOfMonth(prevMonth);
        to = endOfMonth(prevMonth);
        break;
      }
      case 'last30':
        from = subDays(today, 30);
        to = today;
        break;
      case 'quarter':
        from = startOfQuarter(today);
        to = endOfQuarter(today);
        break;
    }

    setFromDate(format(from, "yyyy-MM-dd"));
    setToDate(format(to, "yyyy-MM-dd"));
    setActivePeriodType(type);
  };

  const statusPieData = [
    { name: 'Completed', value: activeStats.done, color: '#10b981' }, 
    { name: 'Pending', value: activeStats.pending, color: '#f59e0b' }, 
    { name: 'Overdue', value: activeStats.delayed, color: '#f43f5e' } 
  ];

  const topEmployeesChartData = useMemo(() => {
    let baseList = employeeLeaderboard;
    if (!isAdmin) {
      baseList = employeeLeaderboard.filter(emp => isUserEmailMatch(emp.email, normalizedUserEmail));
    }
    return [...baseList]
      .slice(0, 5)
      .map(emp => ({
        name: emp.name.split(' ')[0], 
        Done: emp.done,
        Pending: emp.pending,
        Overdue: emp.delayed
      }));
  }, [employeeLeaderboard, isAdmin, normalizedUserEmail]);

  // Executive MIS Calculations and Helpers
  const getInPeriod = (dateVal: any, period: 'daily' | 'weekly' | 'monthly' | 'custom'): boolean => {
    if (!dateVal) return false;
    const d = parseToDate(dateVal);
    const now = new Date();
    
    if (period === 'daily') {
      return d.getDate() === now.getDate() &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    }
    
    if (period === 'weekly') {
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      const sunday = endOfWeek(now, { weekStartsOn: 1 });
      monday.setHours(0,0,0,0);
      sunday.setHours(23,59,59,999);
      const t = d.getTime();
      return t >= monday.getTime() && t <= sunday.getTime();
    }
    
    if (period === 'monthly') {
      return d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    }

    if (period === 'custom') {
      const start = new Date(execFromDate + "T00:00:00");
      const end = new Date(execToDate + "T23:59:59");
      const safeStart = isNaN(start.getTime()) ? new Date(0) : start;
      const safeEnd = isNaN(end.getTime()) ? new Date() : end;
      const t = d.getTime();
      return t >= safeStart.getTime() && t <= safeEnd.getTime();
    }
    
    return false;
  };

  const effectiveExecEmail = isAdmin ? executiveEmpEmail : normalizedUserEmail;

  const activePeriodLabel = useMemo(() => {
    if (executivePeriod === 'daily') return "Today";
    if (executivePeriod === 'weekly') return "This Week";
    if (executivePeriod === 'monthly') return "This Month";
    if (executivePeriod === 'custom') {
      try {
        const fromStr = format(new Date(execFromDate), "MMM d, yyyy");
        const toStr = format(new Date(execToDate), "MMM d, yyyy");
        return `${fromStr} - ${toStr}`;
      } catch {
        return "Custom Period";
      }
    }
    return "This Month";
  }, [executivePeriod, execFromDate, execToDate]);

  // Lead metrics
  const executiveLeadsCreated = useMemo(() => {
    return leads.filter(l => 
      getInPeriod(l.createdAt, executivePeriod) && 
      isLeadCreatedByUser(l, effectiveExecEmail)
    );
  }, [leads, executivePeriod, effectiveExecEmail, execFromDate, execToDate, employees]);

  const executiveLeadsNew = useMemo(() => {
    return leads.filter(l => 
      getInPeriod(l.createdAt, executivePeriod) && 
      l.status === 'New' && 
      isLeadNewOrDiscussionAssignedToUser(l, effectiveExecEmail)
    );
  }, [leads, executivePeriod, effectiveExecEmail, execFromDate, execToDate, employees]);

  const executiveLeadsDiscussion = useMemo(() => {
    return leads.filter(l => 
      getInPeriod(l.updatedAt || l.createdAt, executivePeriod) && 
      (l.status === 'Under Discussion' || l.status === 'Negotiation') && 
      isLeadNewOrDiscussionAssignedToUser(l, effectiveExecEmail)
    );
  }, [leads, executivePeriod, effectiveExecEmail, execFromDate, execToDate, employees]);

  const executiveLeadsWon = useMemo(() => {
    return leads.filter(l => 
      getInPeriod(l.updatedAt || l.createdAt, executivePeriod) && 
      (l.status === 'Won' || l.status === 'Converted') && 
      isLeadSalesAssignedToUser(l, effectiveExecEmail)
    );
  }, [leads, executivePeriod, effectiveExecEmail, execFromDate, execToDate, employees]);

  const executiveLeadsLost = useMemo(() => {
    return leads.filter(l => 
      getInPeriod(l.updatedAt || l.createdAt, executivePeriod) && 
      l.status === 'Lost' && 
      isLeadSalesAssignedToUser(l, effectiveExecEmail)
    );
  }, [leads, executivePeriod, effectiveExecEmail, execFromDate, execToDate, employees]);

  const executiveLeadsClosed = useMemo(() => {
    return leads.filter(l => 
      getInPeriod(l.updatedAt || l.createdAt, executivePeriod) && 
      l.status === 'Completed' && 
      isLeadSalesAssignedToUser(l, effectiveExecEmail)
    );
  }, [leads, executivePeriod, effectiveExecEmail, execFromDate, execToDate, employees]);

  // Task metrics
  const executiveTasksAssigned = useMemo(() => {
    return allMappedTasks.filter(t => 
      getInPeriod(t.assignedDate, executivePeriod) && 
      (effectiveExecEmail === 'all' || isUserEmailMatch(t.assigneeEmail, effectiveExecEmail))
    );
  }, [allMappedTasks, executivePeriod, effectiveExecEmail, execFromDate, execToDate]);

  const executiveTasksCompleted = useMemo(() => {
    return allMappedTasks.filter(t => 
      t.isSubmitted && 
      getInPeriod(t.completionDate, executivePeriod) && 
      (effectiveExecEmail === 'all' || isUserEmailMatch(t.assigneeEmail, effectiveExecEmail))
    );
  }, [allMappedTasks, executivePeriod, effectiveExecEmail, execFromDate, execToDate]);

  const executiveTasksPending = useMemo(() => {
    return allMappedTasks.filter(t => 
      !t.isSubmitted && 
      t.status !== 'pending_overdue' &&
      getInPeriod(t.assignedDate, executivePeriod) && 
      (effectiveExecEmail === 'all' || isUserEmailMatch(t.assigneeEmail, effectiveExecEmail))
    );
  }, [allMappedTasks, executivePeriod, effectiveExecEmail, execFromDate, execToDate]);

  const executiveTasksOverdue = useMemo(() => {
    return allMappedTasks.filter(t => 
      !t.isSubmitted && 
      t.status === 'pending_overdue' &&
      getInPeriod(t.assignedDate, executivePeriod) && 
      (effectiveExecEmail === 'all' || isUserEmailMatch(t.assigneeEmail, effectiveExecEmail))
    );
  }, [allMappedTasks, executivePeriod, effectiveExecEmail, execFromDate, execToDate]);

  // Service Request metrics
  const serviceRequestsFiltered = useMemo(() => {
    return serviceRequests.filter(r => {
      // Check period
      const inPeriod = getInPeriod(r.createdAt, executivePeriod);
      // Check employee assignment filter
      const userMatch = effectiveExecEmail === 'all' || isUserEmailMatch(r.assignedToEmail || '', effectiveExecEmail);
      return inPeriod && userMatch;
    });
  }, [serviceRequests, executivePeriod, effectiveExecEmail, execFromDate, execToDate]);

  const serviceRequestsAssigned = useMemo(() => {
    return serviceRequestsFiltered;
  }, [serviceRequestsFiltered]);

  const serviceRequestsCompleted = useMemo(() => {
    return serviceRequestsFiltered.filter(r => r.status === 'Resolved' || r.status === 'Closed');
  }, [serviceRequestsFiltered]);

  const serviceRequestsPending = useMemo(() => {
    return serviceRequestsFiltered.filter(r => {
      const isCompleted = r.status === 'Resolved' || r.status === 'Closed';
      if (isCompleted) return false;
      
      // Overdue check: is NOT completed, and is less than 3 days old
      if (!r.createdAt) return true;
      const createdDate = parseToDate(r.createdAt);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const isOverdue = createdDate.getTime() < threeDaysAgo.getTime();
      return !isOverdue;
    });
  }, [serviceRequestsFiltered]);

  const serviceRequestsOverdue = useMemo(() => {
    return serviceRequestsFiltered.filter(r => {
      const isCompleted = r.status === 'Resolved' || r.status === 'Closed';
      if (isCompleted) return false;
      
      // Overdue check: is NOT completed, and is older than or equal to 3 days
      if (!r.createdAt) return false;
      const createdDate = parseToDate(r.createdAt);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return createdDate.getTime() < threeDaysAgo.getTime();
    });
  }, [serviceRequestsFiltered]);

  // Drill-down Detail Modal click helpers
  const openLeadsDetails = (title: string, list: Lead[], metricKey?: string) => {
    setModalSearch("");
    setDetailsModal({
      isOpen: true,
      title,
      type: 'leads',
      leadsList: list,
      tasksList: [],
      servicesList: [],
      metricKey: metricKey || ''
    });
  };

  const openTasksDetails = (title: string, list: MappedTask[]) => {
    setModalSearch("");
    setDetailsModal({
      isOpen: true,
      title,
      type: 'tasks',
      leadsList: [],
      tasksList: list,
      servicesList: []
    });
  };

  const openServicesDetails = (title: string, list: ServiceRequest[]) => {
    setModalSearch("");
    setDetailsModal({
      isOpen: true,
      title,
      type: 'services',
      leadsList: [],
      tasksList: [],
      servicesList: list
    });
  };

  const filteredModalLeads = useMemo(() => {
    const list = detailsModal.leadsList || [];
    if (!modalSearch.trim()) return list;
    const q = modalSearch.toLowerCase().trim();
    return list.filter(l => 
      (l.customerName || "").toLowerCase().includes(q) ||
      (l.customerEmail || "").toLowerCase().includes(q) ||
      (l.mobileNumber || "").toLowerCase().includes(q) ||
      (l.city || "").toLowerCase().includes(q) ||
      (l.status || "").toLowerCase().includes(q)
    );
  }, [detailsModal.leadsList, modalSearch]);

  const filteredModalTasks = useMemo(() => {
    const list = detailsModal.tasksList || [];
    if (!modalSearch.trim()) return list;
    const q = modalSearch.toLowerCase().trim();
    return list.filter(t => 
      (t.stepLabel || "").toLowerCase().includes(q) ||
      (t.assigneeName || "").toLowerCase().includes(q) ||
      (t.lead.customerName || "").toLowerCase().includes(q) ||
      (t.status || "").toLowerCase().includes(q)
    );
  }, [detailsModal.tasksList, modalSearch]);

  const filteredModalServices = useMemo(() => {
    const list = detailsModal.servicesList || [];
    if (!modalSearch.trim()) return list;
    const q = modalSearch.toLowerCase().trim();
    return list.filter(r => 
      (r.customerName || "").toLowerCase().includes(q) ||
      (r.issue || "").toLowerCase().includes(q) ||
      (r.issueType || "").toLowerCase().includes(q) ||
      (r.assignedTo || "").toLowerCase().includes(q) ||
      (r.status || "").toLowerCase().includes(q)
    );
  }, [detailsModal.servicesList, modalSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">MIS Report & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">Configure, view and drill-down into company performance indices</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('executive')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'executive'
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Executive Summary
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'operations'
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Operational Ledger
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'capacity'
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Capacity MIS
          </button>
        </div>
      </div>

      {activeTab === 'executive' ? (
        /* ================= EXECUTIVE MIS DASHBOARD ================= */
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Executive Subheader & Range Swappper */}
          <div className="flex flex-col gap-5 bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-md font-bold text-slate-900">Corporate Performance Overview</h2>
                <p className="text-xs text-slate-500">Select reporting period matrix. Click any card index below to trigger detail drill-down.</p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    try {
                      if (!leads.length) return;
                      const headers = ['Ref', 'Prospect Name', 'Email', 'Mobile', 'City', 'Status', 'Creator', 'Created At'];
                      const rows = leads.map(l => [
                        l.id,
                        `"${l.customerName || ''}"`,
                        l.customerEmail || '',
                        l.mobileNumber || '',
                        `"${l.city || ''}"`,
                        l.status || '',
                        `"${l.createdBy || ''}"`,
                        l.createdAt || ''
                      ]);
                      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `MIS_Leads_Dump_${new Date().getTime()}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch (err) {
                      console.error("Export failed", err);
                    }
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-all shrink-0"
                  title="Download CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Export</span>
                </button>
                {/* Sliding segment for reporting timeline */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto max-w-sm shrink-0">
                  {(['daily', 'weekly', 'monthly', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setExecutivePeriod(p)}
                      className={`flex-1 text-center py-2 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        executivePeriod === p 
                          ? "bg-white text-slate-900 shadow-sm font-extrabold" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Filters row: Date Pickers (if custom) & User Selection */}
            {(executivePeriod === 'custom' || isAdmin) && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-slate-100">
                {executivePeriod === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-400">From:</span>
                      <input 
                        type="date"
                        value={execFromDate}
                        onChange={(e) => setExecFromDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer focus:text-indigo-600"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-400">To:</span>
                      <input 
                        type="date"
                        value={execToDate}
                        onChange={(e) => setExecToDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer focus:text-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {/* User Dropdown for Admins */}
                {isAdmin && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-400">Filter Employee:</span>
                    <select
                      value={executiveEmpEmail}
                      onChange={(e) => setExecutiveEmpEmail(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer focus:text-indigo-600 pr-4"
                    >
                      <option value="all">All Employees (Consolidated)</option>
                      {employees.map((emp) => (
                        <option key={emp.id || emp.email} value={emp.email}>
                          {emp.name || emp.email} ({emp.role || 'Executive'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION A: LEADS METRICS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Section I — Lead Funnel Analytics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              
              {/* Leads Created */}
              <MetricCard 
                title="Leads Created"
                count={executiveLeadsCreated.length}
                subtitle="Punched in period"
                icon={Layers3}
                onClick={() => openLeadsDetails(`${activePeriodLabel} • Leads Created`, executiveLeadsCreated, "created")}
              />

              {/* New Leads */}
              <MetricCard 
                title="New"
                count={executiveLeadsNew.length}
                subtitle="Awaiting action"
                icon={Sparkles}
                color="blue"
                onClick={() => openLeadsDetails(`${activePeriodLabel} • New Leads`, executiveLeadsNew, "new")}
              />

              <MetricCard 
                title="Under Discussion"
                count={executiveLeadsDiscussion.length}
                subtitle="Active negotiations"
                icon={Briefcase}
                color="amber"
                onClick={() => openLeadsDetails(`${activePeriodLabel} • Under Discussion`, executiveLeadsDiscussion, "discussion")}
              />

              <MetricCard 
                title="Won"
                count={executiveLeadsWon.length}
                subtitle="Converted successfully"
                icon={TrendingUp}
                color="emerald"
                onClick={() => openLeadsDetails(`${activePeriodLabel} • Won Leads`, executiveLeadsWon, "won")}
              />

              <MetricCard 
                title="Lost"
                count={executiveLeadsLost.length}
                subtitle="Dropped / Cold"
                icon={TrendingDown}
                color="rose"
                onClick={() => openLeadsDetails(`${activePeriodLabel} • Lost Leads`, executiveLeadsLost, "lost")}
              />

              <MetricCard 
                title="Completed"
                count={executiveLeadsClosed.length}
                subtitle="Completed installations"
                icon={CheckSquare}
                color="teal"
                onClick={() => openLeadsDetails(`${activePeriodLabel} • Closed Leads`, executiveLeadsClosed, "closed")}
              />

            </div>
          </div>

          {/* SECTION B: TASK METRICS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Section II — Execution Deliverables</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              <MetricCard 
                title="Assigned Tasks"
                count={executiveTasksAssigned.length}
                subtitle="Processes initiated"
                icon={Users}
                onClick={() => openTasksDetails(`${activePeriodLabel} • Total Assigned Tasks`, executiveTasksAssigned)}
              />

              <MetricCard 
                title="Completed Tasks"
                count={executiveTasksCompleted.length}
                subtitle="Milestone steps cleared"
                icon={CheckCircle2}
                color="emerald"
                onClick={() => openTasksDetails(`${activePeriodLabel} • Completed Tasks`, executiveTasksCompleted)}
              />

              <MetricCard 
                title="Pending Tasks"
                count={executiveTasksPending.length}
                subtitle="Active execution"
                icon={Clock}
                color="amber"
                onClick={() => openTasksDetails(`${activePeriodLabel} • Pending Tasks`, executiveTasksPending)}
              />

              <MetricCard 
                title="Overdue Tasks"
                count={executiveTasksOverdue.length}
                subtitle="Exceeding deadline"
                icon={AlertCircle}
                color="rose"
                onClick={() => openTasksDetails(`${activePeriodLabel} • Overdue Tasks`, executiveTasksOverdue)}
              />

            </div>
          </div>

          {/* SECTION C: SERVICE TASK METRICS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Section III — Service Tasks Performance Index</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Assigned Service Tasks */}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openServicesDetails(`${activePeriodLabel} • Total Assigned Service Requests`, serviceRequestsAssigned)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">Assigned Services</span>
                  <h2 className="text-4xl font-extrabold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">{serviceRequestsAssigned.length}</h2>
                  <p className="text-xs font-medium text-slate-500">Service tickets received in period</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Completed Service Tasks */}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openServicesDetails(`${activePeriodLabel} • Resolved/Closed Service Requests`, serviceRequestsCompleted)}
                className="bg-white hover:bg-emerald-50/20 border border-slate-200/80 hover:border-emerald-300 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">Completed Services</span>
                  <h2 className="text-4xl font-extrabold text-emerald-600 leading-none">{serviceRequestsCompleted.length}</h2>
                  <p className="text-xs font-medium text-slate-500">Service tickets resolved or closed</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Pending Service Tasks */}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openServicesDetails(`${activePeriodLabel} • Pending Service Requests`, serviceRequestsPending)}
                className="bg-white hover:bg-amber-50/20 border border-slate-200/80 hover:border-amber-300 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-amber-600 transition-colors">Pending Services</span>
                  <h2 className="text-4xl font-extrabold text-amber-600 leading-none">{serviceRequestsPending.length}</h2>
                  <p className="text-xs font-medium text-slate-500">Service tickets active and on-track</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
              </motion.div>
              
              {/* Overdue Service Tasks */}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openServicesDetails(`${activePeriodLabel} • Overdue Service Requests`, serviceRequestsOverdue)}
                className="bg-white hover:bg-rose-50/20 border border-slate-200/80 hover:border-rose-300 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-rose-600 transition-colors">Overdue Services</span>
                  <h2 className="text-4xl font-extrabold text-rose-600 leading-none">{serviceRequestsOverdue.length}</h2>
                  <p className="text-xs font-medium text-slate-500">Active tickets exceeding 3-day SLA</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </motion.div>

            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-5 flex items-start gap-3.5 max-w-xl">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">Dynamic Admin Drill-downs</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clicking on any of the corporate indices above compiles a ledger in real-time. From the modal list, clicking on any record row loads the full client record automatically.
              </p>
            </div>
          </div>

        </div>
      ) : activeTab === 'capacity' ? (
        <CapacityMIS leads={leads} onLeadSelect={(leadId) => onSelectLead(leadId)} />
      ) : (
        /* ================= PRE-EXISTING OPERATIONAL LEDGER ================= */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Quick filter block from pre-existing dashboard */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200/60 p-4 rounded-2xl shadow-xs">
            <span className="text-xs font-bold text-slate-500">Historical Operational Range:</span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <select 
                className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={activePeriodType}
                onChange={(e) => applyQuickPeriod(e.target.value)}
              >
                <option value="thisweek">This Week</option>
                <option value="thismonth">This Month</option>
                <option value="lastmonth">Last Month</option>
                <option value="last30">Last 30 Days</option>
                <option value="quarter">This Quarter</option>
                <option value="custom">Custom Range</option>
              </select>

              <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-lg px-2">
                <input 
                  type="date" 
                  className="text-sm py-2 px-1 outline-none text-gray-700 bg-transparent"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setActivePeriodType('custom'); }}
                />
                <span className="text-gray-300">-</span>
                <input 
                  type="date" 
                  className="text-sm py-2 px-1 outline-none text-gray-700 bg-transparent"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setActivePeriodType('custom'); }}
                />
              </div>
            </div>
          </div>

          {/* OVERVIEW STATS (Global or Selected) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
                <Layers className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeStats.received}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">{activeStats.done}</p>
                <span className="text-sm text-emerald-600 font-medium">({activeStats.scorePercent}%)</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeStats.pending}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-500">Overdue</h3>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeStats.delayed}</p>
            </div>
          </div>

          {/* DASHBOARD CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center justify-center">
              <h3 className="w-full text-left text-sm font-semibold text-gray-900 mb-4">Status Distribution</h3>
              {activeStats.received > 0 ? (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#374151', fontSize: '14px', fontWeight: 500 }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <span className="text-sm text-gray-400">No data available</span>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{isAdmin ? "Top Team Productivity" : "Your Productivity"}</h3>
              {topEmployeesChartData.length > 0 && topEmployeesChartData.some(d => d.Done > 0 || d.Pending > 0 || d.Overdue > 0) ? (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topEmployeesChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#F3F4F6' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                      <Bar dataKey="Done" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={32} />
                      <Bar dataKey="Pending" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Overdue" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                 <div className="h-[220px] flex items-center justify-center">
                  <span className="text-sm text-gray-400">No data available</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEADERBOARD / TEAM MEMBERS */}
            {isAdmin && (
              <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
                  <h3 className="font-semibold text-gray-900">Leaderboard</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search team..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="overflow-y-auto flex-1 p-2 space-y-1 block max-h-[480px]">
                  <button
                    onClick={() => setSelectedEmpEmail("all")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors ${
                      selectedEmpEmail === "all" ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">Consolidated View</span>
                    </div>
                  </button>

                  {visibleLeaderboard.map(emp => {
                    const isSelected = selectedEmpEmail === emp.email;
                    return (
                      <button
                        key={emp.email}
                        onClick={() => setSelectedEmpEmail(emp.email)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors ${
                          isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center font-medium text-[10px] uppercase shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                            {emp.name.substring(0,2)}
                          </div>
                          <div className="truncate">
                            <div className="font-medium truncate">{emp.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{emp.done}/{emp.received} ({emp.scorePercent}%)</div>
                          </div>
                        </div>
                        {emp.delayed > 0 && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-rose-500" title={`${emp.delayed} overdue`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TASK LEDGER TABLE */}
            <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[600px]`}>
              <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Task Ledger</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{activeStats.name}</p>
                </div>
                
                <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-200 rounded-lg w-full sm:w-auto">
                  {[
                    { id: "all", label: "All" },
                    { id: "pending", label: "Pending" },
                    { id: "overdue", label: "Overdue" },
                    { id: "done", label: "Completed" }
                  ].map(status => (
                    <button
                      key={status.id}
                      onClick={() => setLedgerFilterStatus(status.id)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        ledgerFilterStatus === status.id 
                          ? "bg-white text-gray-900 shadow-sm" 
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {filteredLedgerTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
                    <BarChart3 className="w-10 h-10 text-slate-300 mb-3 animate-bounce" />
                    <p className="text-sm font-bold text-slate-700">No tasks found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or date range.</p>
                  </div>
                ) : (
                  <div className="p-4 flex-1 overflow-y-auto">
                    <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-[#0f172a] text-slate-200 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-300">
                            <tr>
                              <th className="px-5 py-4 font-extrabold text-left">Task</th>
                              <th className="px-5 py-4 font-extrabold text-left font-sans">Assigned To</th>
                              <th className="px-5 py-4 font-extrabold text-left">Customer Details</th>
                              <th className="px-5 py-4 font-extrabold text-left text-xs sm:text-xxs">Due Date</th>
                              <th className="px-5 py-4 font-extrabold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredLedgerTasks.map(task => {
                              const isOverdue = task.status === 'pending_overdue';
                              const isDone = task.isSubmitted;
                              return (
                                <tr 
                                  key={task.id} 
                                  className="hover:bg-slate-50 last:border-0 cursor-pointer transition-colors group"
                                  onClick={() => onSelectLead(task.lead.id, task.stepId, task.tab)}
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <CheckSquare className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.stepLabel}</div>
                                        <div className="text-[10px] text-indigo-600 bg-indigo-50/60 font-bold px-1.5 py-0.5 rounded capitalize w-fit mt-0.5">{task.tab.replace('_', ' ')} Tab</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="font-bold text-slate-800 flex items-center gap-1">
                                      <UserIcon className="w-3 h-3 text-slate-400" />
                                      {task.assigneeName || "Unassigned"}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{task.assigneeEmail || "-"}</div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="font-bold text-slate-850">{task.lead.customerName || "-"}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-semibold text-slate-400">{task.lead.leadId || "-"}</div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                      {format(task.dueDate, "MMM d, yyyy")}
                                    </div>
                                    {isOverdue && <span className="inline-block mt-0.5 text-[9px] text-rose-500 font-black uppercase tracking-widest">Immediate Attention</span>}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      isDone 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                        : isOverdue 
                                          ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" 
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        isDone 
                                          ? "bg-emerald-500" 
                                          : isOverdue 
                                            ? "bg-rose-500" 
                                            : "bg-amber-500"
                                      }`} />
                                      {isDone ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= DRILL-DOWN LEDGER DETAILS MODAL ================= */}
      <AnimatePresence>
        {detailsModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDetailsModal(prev => ({ ...prev, isOpen: false }));
                setModalSearch("");
              }}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-[4px]"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              
              {/* Header section of Modal */}
              <div className="p-6 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 relative flex"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span></span>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{detailsModal.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    {detailsModal.type === 'leads' 
                      ? `${filteredModalLeads.length} leads in compilation. Click row to edit/view lead detail.`
                      : `${filteredModalTasks.length} tasks in compilation. Click row to execute step.`
                    }
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search in Modal */}
                  <div className="relative shrink-0 w-48 sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/30 font-semibold text-slate-700"
                      placeholder="Filter records..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setDetailsModal(prev => ({ ...prev, isOpen: false }));
                      setModalSearch("");
                    }}
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Table Body container */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {detailsModal.type === 'leads' ? (
                  /* Leads list inside modal */
                  filteredModalLeads.length === 0 ? (
                    <div className="py-20 text-center space-y-2 bg-white rounded-2xl border border-slate-200/80">
                      <Layers3 className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No matching leads</p>
                      <p className="text-xs text-slate-400">Search value does not match any compiled rows.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-[#0f172a] text-slate-100 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-300">
                            <tr>
                              <th className="px-5 py-4 font-extrabold">Lead ID & Date</th>
                              <th className="px-5 py-4 font-extrabold">Customer Details</th>
                              <th className="px-5 py-4 font-extrabold">Requirement (kW)</th>
                              <th className="px-5 py-4 font-extrabold">City & Contact</th>
                              <th className="px-5 py-4 font-extrabold">
                                {detailsModal.metricKey === 'created' || detailsModal.metricKey === 'new' || detailsModal.metricKey === 'discussion'
                                  ? "Created By"
                                  : "Assignees"
                                }
                              </th>
                              <th className="px-5 py-4 font-extrabold text-right">Current Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredModalLeads.map((lead) => {
                              const dateStr = lead.createdAt ? format(parseToDate(lead.createdAt), "MMM d, yyyy") : "N/A";
                              return (
                                <tr
                                  key={lead.id}
                                  onClick={() => {
                                    onSelectLead(lead.id, undefined, 'basic');
                                    setDetailsModal(prev => ({ ...prev, isOpen: false }));
                                    setModalSearch("");
                                  }}
                                  className="hover:bg-slate-50 last:border-0 cursor-pointer transition-colors group"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Briefcase className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.leadId || "N/A"}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          {dateStr}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800">{lead.customerName || "-"}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{lead.customerEmail || "-"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        {lead.requiredKw ? `${lead.requiredKw} KW` : "N/A"}
                                      </div>
                                      <div className="text-[10px] text-indigo-600 bg-indigo-50/50 justify-start w-fit px-1.5 py-0.5 rounded font-bold mt-1 tracking-wider uppercase text-[9px]">{lead.projectType || "Residential"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-slate-800">{lead.city || "-"}</div>
                                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                        <span className="text-slate-400 font-bold">☏</span> {lead.mobileNumber || "-"}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    {detailsModal.metricKey === 'created' || detailsModal.metricKey === 'new' || detailsModal.metricKey === 'discussion' ? (
                                      <div className="flex flex-col gap-1 justify-start">
                                        <div className="font-bold text-slate-850 flex items-center gap-1.5">
                                          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                            <UserIcon className="w-3 h-3" />
                                          </div>
                                          <span>{formatCreatorName(lead.createdByName, lead.createdBy)}</span>
                                        </div>
                                        {lead.createdBy && lead.createdBy !== lead.createdByName && (
                                          <div className="text-[10px] text-slate-400 font-bold pl-6.5">
                                            {lead.createdBy}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1.5 justify-start">
                                        {lead.assignedPreSalesName || (lead as any).assignedToName ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">Pre-Sales</span>
                                            <span className="font-bold text-slate-800 text-[11px]">{lead.assignedPreSalesName || (lead as any).assignedToName}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 opacity-65">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-wider">Pre-Sales</span>
                                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                                          </div>
                                        )}
                                        {lead.assignedSales ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">Sales</span>
                                            <span className="font-bold text-slate-800 text-[11px]">{lead.assignedSales}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 opacity-65">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-wider">Sales</span>
                                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      lead.status === 'Won' || lead.status === 'Converted'
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : lead.status === 'Lost'
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : lead.status === 'Completed'
                                            ? "bg-teal-50 text-teal-700 border-teal-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        lead.status === 'Won' || lead.status === 'Converted'
                                          ? "bg-emerald-500"
                                          : lead.status === 'Lost'
                                            ? "bg-rose-500"
                                            : lead.status === 'Completed'
                                              ? "bg-teal-500"
                                              : "bg-amber-500"
                                      }`} />
                                      {lead.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : detailsModal.type === 'tasks' ? (
                  /* Tasks list inside modal */
                  filteredModalTasks.length === 0 ? (
                    <div className="py-20 text-center space-y-2 bg-white rounded-2xl border border-slate-200/80">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                      <p className="text-sm font-bold text-slate-700">No matching tasks</p>
                      <p className="text-xs text-slate-400">Search value does not match any compiled rows.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-[#0f172a] text-slate-100 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-300">
                            <tr>
                              <th className="px-5 py-4 font-extrabold">Task Step</th>
                              <th className="px-5 py-4 font-extrabold">Department Assignee</th>
                              <th className="px-5 py-4 font-extrabold">Customer Detail</th>
                              <th className="px-5 py-4 font-extrabold">Date Matrix</th>
                              <th className="px-5 py-4 font-extrabold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredModalTasks.map((task) => {
                              const isOverdue = task.status === 'pending_overdue';
                              const isDone = task.isSubmitted;
                              return (
                                <tr
                                  key={task.id}
                                  onClick={() => {
                                    onSelectLead(task.lead.id, task.stepId, task.tab);
                                    setDetailsModal(prev => ({ ...prev, isOpen: false }));
                                    setModalSearch("");
                                  }}
                                  className="hover:bg-slate-50 last:border-0 cursor-pointer transition-colors group"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <CheckSquare className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.stepLabel}</div>
                                        <div className="text-[10px] text-indigo-600 bg-indigo-50/70 font-bold px-1.5 py-0.5 rounded capitalize w-fit mt-0.5">{task.tab.replace('_', ' ')} Tab</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-1">
                                        <UserIcon className="w-3 h-3 text-slate-400" />
                                        {task.assigneeName || "Unassigned"}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{task.assigneeEmail || "-"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800">{task.lead.customerName || "-"}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold text-slate-400">{task.lead.leadId || "-"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                                        <span className="text-slate-400 font-bold">Assigned:</span> {format(task.assignedDate, "MMM d")}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                                        <span className="text-slate-400 font-bold">Due:</span> {format(task.dueDate, "MMM d, yyyy")}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      isDone 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                        : isOverdue 
                                          ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" 
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        isDone 
                                          ? "bg-emerald-500" 
                                          : isOverdue 
                                            ? "bg-rose-500" 
                                            : "bg-amber-500"
                                      }`} />
                                      {isDone ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : (
                  /* Services list inside modal */
                  filteredModalServices.length === 0 ? (
                    <div className="py-20 text-center space-y-2 bg-white rounded-2xl border border-slate-200/80">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                      <p className="text-sm font-bold text-slate-700">No matching service requests</p>
                      <p className="text-xs text-slate-400">Search value does not match any rows in active period.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-[#0f172a] text-slate-100 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-300">
                            <tr>
                              <th className="px-5 py-4 font-extrabold">Service ID & Date</th>
                              <th className="px-5 py-4 font-extrabold">Customer Name & Mobile</th>
                              <th className="px-5 py-4 font-extrabold">Issue Details</th>
                              <th className="px-5 py-4 font-extrabold">Technician Assignee</th>
                              <th className="px-5 py-4 font-extrabold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredModalServices.map((req) => {
                              const dateStr = req.createdAt ? format(parseToDate(req.createdAt), "MMM d, yyyy") : "N/A";
                              const isDone = req.status === 'Resolved' || req.status === 'Closed';
                              const isOverdue = !isDone && (() => {
                                if (!req.createdAt) return false;
                                const createdDate = parseToDate(req.createdAt);
                                const threeDaysAgo = new Date();
                                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                                return createdDate.getTime() < threeDaysAgo.getTime();
                              })();
                              return (
                                <tr
                                  key={req.id}
                                  className="hover:bg-slate-50 last:border-0 transition-colors group"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Briefcase className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900">{(req.id || "").slice(0, 8).toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                          {dateStr}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800">{req.customerName || "-"}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold text-slate-400">{req.mobileNumber || "-"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800 truncate max-w-xs">{req.issue || "-"}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold text-slate-400">{req.issueType || "-"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-1">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                        {req.assignedTo || "Unassigned"}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{req.assignedToEmail || "-"}</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      isDone 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                        : isOverdue 
                                          ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" 
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        isDone 
                                          ? "bg-emerald-500" 
                                          : isOverdue 
                                            ? "bg-rose-500" 
                                            : "bg-amber-500"
                                      }`} />
                                      {isDone ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Modal Footer block */}
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end shrink-0">
                <button
                  onClick={() => {
                    setDetailsModal(prev => ({ ...prev, isOpen: false }));
                    setModalSearch("");
                  }}
                  className="px-6 py-2.5 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-slate-100 hover:shadow-xs border border-slate-200"
                >
                  Close Matrix
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
