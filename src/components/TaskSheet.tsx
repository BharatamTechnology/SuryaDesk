import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { leadService } from "../services/leadService";
import { paymentService } from "../services/paymentService";
import { userService } from "../services/userService";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { Lead, AppUser, Tab, PaymentRecord } from "../types";
import { format } from "date-fns";
import {
  ClipboardList,
  Calendar,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  Activity,
  DollarSign,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

interface TaskSheetProps {
  user: User | null;
  role: AppUser["role"] | null;
  onSelectTask: (leadId: string, stepId?: number, tab?: Tab) => void;
}

export default function TaskSheet({
  user,
  role,
  onSelectTask,
}: TaskSheetProps) {
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
      getDoc(docRef)
        .then((snap) => {
          if (snap.exists()) {
            setDbUser(snap.data() as AppUser);
          }
        })
        .catch((err) => {
          console.error("Error fetching db user info in TaskSheet:", err);
        });
    }
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<"mine" | "all" | "incharge">(
    role === "Admin" ? "all" : "mine",
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [groupByProject, setGroupByProject] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [selectedPaymentTask, setSelectedPaymentTask] =
    useState<PaymentRecord | null>(null);

  // For modal form editing
  const [editAmount, setEditAmount] = useState("");
  const [editUtr, setEditUtr] = useState("");
  const [editType, setEditType] =
    useState<PaymentRecord["paymentType"]>("Advance");
  const [editDate, setEditDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPaymentTask) {
      const parsedAmount = Number(selectedPaymentTask.amount);
      setEditAmount(isNaN(parsedAmount) ? "" : String(parsedAmount));
      setEditUtr(selectedPaymentTask.utrNo || "");
      setEditType(selectedPaymentTask.paymentType || "Advance");
      setEditDate(
        selectedPaymentTask.date || new Date().toISOString().split("T")[0],
      );
      setEditRemarks(selectedPaymentTask.remarks || "");
      setConfirmError(null);
    }
  }, [selectedPaymentTask]);

  useEffect(() => {
    setSelectedLeadId("all");
  }, [viewMode]);

  const SEQUENCE = [
    {
      emailField: "assignedPreSales",
      nameField: "assignedPreSalesName",
      submitField: "isPreSalesSubmitted",
      label: "Pre-Sales",
      tab: "pre_sales",
    },
    {
      emailField: "assignedTo",
      nameField: "assignedToName",
      submitField: "isSurveySubmitted",
      label: "Section B: Site Survey",
      tab: "survey",
    },
    {
      emailField: "assignedSalesEmail",
      nameField: "assignedSalesName",
      submitField: "isSalesSubmitted",
      label: "Section C: Sales Follow-up",
      tab: "sales",
    },
    {
      emailField: "projectAssigneeEmail",
      nameField: "projectAssignee",
      submitField: "isFinancialsSubmitted",
      label: "Section D: Project Details",
      tab: "financials",
    },
    {
      emailField: "accAssigneeEmail",
      nameField: "accAssignee",
      submitField: "isAccountsSubmitted",
      label: "Section G: Account Confirmation",
      tab: "accounts",
    },
    {
      emailField: "s_docCorr_assignedToEmail",
      nameField: "s_docCorr_assignedTo",
      submitField: "isStep1Submitted",
      condition: (l: any) => l.s_docCorr_required === "Yes",
      label: "Step 1: Doc Correction",
      tab: "execution",
      stepId: 1,
    },
    {
      emailField: "s_loadExt_assignedToEmail",
      nameField: "s_loadExt_assignedTo",
      submitField: "isStep2Submitted",
      condition: (l: any) => l.loadExtensionRequired === "Yes",
      label: "Step 2: Load Extension",
      tab: "execution",
      stepId: 2,
    },
    {
      emailField: "execution_assignedToEmail",
      nameField: "execution_assignedTo",
      submitField: "isStep3Submitted",
      label: "Step 3: Online Reg",
      tab: "execution",
      stepId: 3,
    },
    {
      emailField: "s4_loanAssignedToEmail",
      nameField: "s4_loanAssignedTo",
      submitField: "isStep4Submitted",
      condition: (l: any) => l.loanRequired === "Yes",
      label: "Step 4: Loan Process",
      tab: "execution",
      stepId: 4,
    },
    {
      emailField: "s5_storeDispatchAssignedToEmail",
      nameField: "s5_storeDispatchAssignedTo",
      submitField: "isStep5Submitted",
      label: "Step 5: Meter Dispatch",
      tab: "execution",
      stepId: 5,
    },
    {
      emailField: "s5_discomPreAssignedToEmail",
      nameField: "s5_discomPreAssignedTo",
      submitField: "isStep6Submitted",
      label: "Step 6: Discom Pre-Install",
      tab: "execution",
      stepId: 6,
    },
    {
      emailField: "s6_inchargeAssignedToEmail",
      nameField: "s6_inchargeAssignedTo",
      submitField: "isStep7Submitted",
      label: "Step 7: Site Incharge",
      tab: "execution",
      stepId: 7,
    },
    {
      emailField: "s5_storeInchargeAssignedToEmail",
      nameField: "s5_storeInchargeAssignedTo",
      submitField: "isStep8Submitted",
      label: "Step 8: Store Incharge",
      tab: "execution",
      stepId: 8,
    },
    {
      emailField: "s6_assignedToEmail",
      nameField: "s6_assignedTo",
      submitField: "isStep9Submitted",
      label: "Step 9: Site Team",
      tab: "execution",
      stepId: 9,
    },
    {
      emailField: "s7_assignedToEmail",
      nameField: "s7_assignedTo",
      submitField: "isStep10Submitted",
      label: "Step 10: Office Exec",
      tab: "execution",
      stepId: 10,
    },
    {
      emailField: "s8_assignedToEmail",
      nameField: "s8_assignedTo",
      submitField: "isStep11Submitted",
      label: "Step 11: Discom Post-Install",
      tab: "execution",
      stepId: 11,
    },
    {
      emailField: "s9_assignedToEmail",
      nameField: "s9_assignedTo",
      submitField: "isStep12Submitted",
      label: "Step 12: Loan Final",
      tab: "execution",
      stepId: 12,
    },
    {
      emailField: "s11_assignedToEmail",
      nameField: "s11_assignedTo",
      submitField: "isStep13Submitted",
      label: "Step 13: Subsidy",
      tab: "execution",
      stepId: 13,
    },
    {
      emailField: "projectInchargeEmail",
      nameField: "projectInchargeName",
      submitField: "isExecutionSubmitted",
      label: "Final Execution Review",
      tab: "project_incharge",
    },
  ];

  useEffect(() => {
    setLoading(true);
    const unsubscribeLeads = leadService.subscribeToLeads(
      role,
      user?.email,
      (data) => {
        setLeads(data as unknown as Lead[]);
      },
    );

    const unsubscribePayments = paymentService.subscribeToPendingPayments(
      (pymts) => {
        setPendingPayments(pymts || []);
      },
    );

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
      const leadAccEmail = associatedLead.accAssigneeEmail
        ?.toLowerCase()
        .trim();
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
    let matchedUserByCollection = users.find(
      (u) => (u.name || "").toLowerCase().trim() === assignee,
    );
    if (!matchedUserByCollection) {
      matchedUserByCollection = users.find((u) => {
        const uName = (u.name || "").toLowerCase().trim();
        return uName.includes(assignee) || assignee.includes(uName);
      });
    }
    if (
      matchedUserByCollection &&
      email &&
      (matchedUserByCollection.email || "").toLowerCase().trim() === email
    ) {
      return true;
    }

    // 3. Fallback and custom triggers
    if (
      assignee === "admin" &&
      (role === "Admin" || email === "hemant.tyagi@bharatamtechnology.com")
    ) {
      return true;
    }
    if (
      (assignee === "sitvik" ||
        assignee === "sitvik (admin)" ||
        assignee === "satvik") &&
      (email === "sitvik24@gmail.com" ||
        dbUserName?.includes("sitvik") ||
        dbUserName?.includes("satvik"))
    ) {
      return true;
    }
    if (assignee === "sitvik (admin)" && role === "Admin") {
      return true;
    }
    if (
      assignee === "anmol rathi" &&
      (email === "anmolrathi20@gmail.com" || dbUserName === "anmol rathi")
    ) {
      return true;
    }
    if (
      assignee === "test user" &&
      (email === "hemant.tyagi@bharatamtechnology.com" ||
        email === "testuser@example.com" ||
        email?.includes("testuser") ||
        dbUserName === "test user" ||
        role === "Admin")
    ) {
      return true;
    }
    return false;
  };

  const getPendingTasks = () => {
    const leadTasks = leads
      .map((l) => {
        if (
          l.status === "Lost" ||
          l.status === "Converted" ||
          l.status === "Completed"
        )
          return null;

        const hasReachedFurtherSteps = l.status === "Won";

        const isProjectCoordinator = dbUser?.category === "Project Coordinator";
        const currentSteps = SEQUENCE.filter((step, index) => {
          if (isProjectCoordinator && step.label === "Final Execution Review") return false;
          if (!hasReachedFurtherSteps && index >= 3) return false;
          if (hasReachedFurtherSteps && index < 3) return false;
          if (step.condition && !step.condition(l)) return false;

          const assignedEmail = (l as any)[step.emailField];
          const assignedName = (l as any)[step.nameField];
          const isMine =
            typeof assignedEmail === "string" &&
            assignedEmail.toLowerCase().trim() === normalizedUserEmail;
          const isSubmitted = (l as any)[step.submitField];

          // If viewMode is 'mine', only show my tasks
          // If viewMode is 'incharge', show tasks for the Project Incharge (Oversight + Unassigned Execution steps)
          // If viewMode is 'all' (Admin only), show all assigned tasks that aren't submitted
          const isProjectInchargeOfThisLead =
            typeof l.projectInchargeEmail === "string" &&
            l.projectInchargeEmail.toLowerCase().trim() === normalizedUserEmail;

          if (viewMode === "mine") {
            return isMine && !isSubmitted;
          }

          if (viewMode === "incharge") {
            const isLeadUnderMyIncharge =
              isProjectInchargeOfThisLead || role === "Admin";
            if (!isLeadUnderMyIncharge) return false;

            // Show only Project Control execution steps (steps 1-14), excluding Oversight
            const isProjectControlExecutionStep = step.tab === "execution";
            return (
              isProjectControlExecutionStep && !!assignedEmail && !isSubmitted
            );
          }

          if (viewMode === "all") {
            return !!assignedEmail && !isSubmitted;
          }

          return false;
        });

        return currentSteps.map((step) => {
          let dateValue = l.updatedAt;
          if (l.stepAssignmentDates && l.stepAssignmentDates[step.label]) {
            dateValue = l.stepAssignmentDates[step.label];
          }

          const assignedEmail = (l as any)[step.emailField];
          const displayLabel = step.label;

          let dueDate = null;
          if (step.label === "Section B: Site Survey") {
            dueDate = l.siteVisitDate || l.planSiteVisitDate;
          } else if (step.label === "Section C: Sales Follow-up") {
            dueDate = l.nextFollowUpDate;
          } else if (
            step.stepId &&
            l.stepDueDates &&
            l.stepDueDates[step.stepId]
          ) {
            dueDate = l.stepDueDates[step.stepId];
          }

          if (!dueDate) {
            const baseDate = dateValue
              ? dateValue.seconds
                ? new Date(dateValue.seconds * 1000)
                : new Date(dateValue)
              : new Date();
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
            assigneeName: (l as any)[step.nameField] || "Unassigned",
            assigneeEmail: assignedEmail || "",
            isMine:
              typeof assignedEmail === "string" &&
              assignedEmail.toLowerCase().trim() === normalizedUserEmail,
            isPaymentTask: false,
          };
        });
      })
      .flat()
      .filter(Boolean);

    const paymentTasks = pendingPayments
      .map((p) => {
        const associatedLead = leads.find((l) => l.id === p.leadId);
        if (!associatedLead) return null;

        let visible = false;

        // Hide legacy duplicate advance payment tasks if the lead handles it in Section G
        // This prevents the duplicate task where both Section G and Payment task are created
        if (
          p.paymentType === "Advance" &&
          (associatedLead.accAssignee || associatedLead.accAssigneeEmail)
        ) {
          return null;
        }

        if (viewMode === "mine") {
          visible = isPymtMine(p, associatedLead);
        } else if (viewMode === "all") {
          visible = true; // Admin sees all
        } else if (viewMode === "incharge") {
          visible = isPymtMine(p, associatedLead);
        }

        if (!visible) return null;

        const createdDate = p.recordedAt
          ? p.recordedAt.seconds
            ? new Date(p.recordedAt.seconds * 1000)
            : new Date(p.recordedAt)
          : new Date();

        let assigneeEmail = p.recordedBy || "";
        const assigneeLower = (p.confirmationAssignee || "")
          .toLowerCase()
          .trim();
        if (assigneeLower) {
          // 1. Dynamic check in live users collection from Settings tab
          let matchedUser = users.find(
            (u) => (u.name || "").toLowerCase().trim() === assigneeLower,
          );
          if (!matchedUser) {
            matchedUser = users.find((u) => {
              const uName = (u.name || "").toLowerCase().trim();
              return (
                uName.includes(assigneeLower) || assigneeLower.includes(uName)
              );
            });
          }

          if (matchedUser) {
            assigneeEmail = matchedUser.email || "";
          } else if (
            associatedLead &&
            (associatedLead.accAssignee || "").toLowerCase().trim() ===
              assigneeLower
          ) {
            assigneeEmail = associatedLead.accAssigneeEmail || assigneeEmail;
          } else if (
            assigneeLower === "sitvik" ||
            assigneeLower === "sitvik (admin)" ||
            assigneeLower === "satvik"
          ) {
            assigneeEmail = "sitvik24@gmail.com";
          } else if (assigneeLower === "anmol rathi") {
            assigneeEmail = "anmolrathi20@gmail.com";
          } else if (assigneeLower === "admin") {
            assigneeEmail = "hemant.tyagi@bharatamtechnology.com";
          }
        }

        return {
          lead: associatedLead,
          label:
            p.paymentType === "Other"
              ? `Confirm Payment: Other (₹${p.amount.toLocaleString()})`
              : `Confirm ${p.paymentType} Payment (₹${p.amount.toLocaleString()})`,
          tab: "accounts" as Tab,
          payment: p,
          assignedDate: p.recordedAt,
          dueDate: createdDate,
          assigneeName: p.confirmationAssignee || "Unassigned",
          assigneeEmail: assigneeEmail,
          isMine: isPymtMine(p, associatedLead),
          isPaymentTask: true,
        };
      })
      .filter(Boolean);

    return [...leadTasks, ...paymentTasks] as {
      lead: Lead;
      label: string;
      tab: Tab;
      stepId?: number;
      assignedDate: any;
      dueDate: any;
      assigneeName: string;
      assigneeEmail: string;
      isMine: boolean;
      isPaymentTask?: boolean;
      payment?: PaymentRecord;
    }[];
  };

  const allInchargePendingTasks = getPendingTasks();

  const inchargeLeads = leads.filter((l) => {
    if (
      l.status === "Lost" ||
      l.status === "Converted" ||
      l.status === "Completed"
    )
      return false;
    const isProjectInchargeOfThisLead =
      typeof l.projectInchargeEmail === "string" &&
      l.projectInchargeEmail.toLowerCase().trim() === normalizedUserEmail;
    return isProjectInchargeOfThisLead || role === "Admin";
  });

  const pendingTasks =
    viewMode === "incharge" && selectedLeadId !== "all"
      ? allInchargePendingTasks.filter((t) => t.lead.id === selectedLeadId)
      : allInchargePendingTasks;

  const projectStats = useMemo(() => {
    const globalTotal = leads.length;
    const globalPending = leads.filter(
      (l) =>
        l.status !== "Completed" &&
        l.status !== "Lost" &&
        l.status !== "Converted",
    ).length;

    const activeProjectIds = new Set(
      pendingTasks.map((t) => t.lead?.id).filter(Boolean),
    );
    const contextualCount = activeProjectIds.size;

    return {
      globalTotal,
      globalPending,
      contextualCount,
    };
  }, [leads, pendingTasks]);

  const getTaskStatus = (task: any) => {
    if (task.isPaymentTask) {
      return task.payment?.status || "Pending";
    }
    if (task.stepId && task.lead) {
      const statusKey = `step${task.stepId}Status` as keyof Lead;
      return (task.lead[statusKey] as string) || "Pending";
    }
    if (task.tab === "pre_sales") {
      return task.lead?.preSalesStatus || (task.lead?.isPreSalesSubmitted ? "Completed" : "Pending");
    }
    if (task.tab === "survey") {
      return task.lead?.isSurveySubmitted ? "Completed" : "Pending";
    }
    if (task.tab === "sales") {
      return task.lead?.salesRemark ? "In Progress" : "Pending";
    }
    if (task.tab === "financials") {
      return task.lead?.isFinancialsSubmitted ? "Completed" : "Pending";
    }
    if (task.tab === "accounts") {
      return task.lead?.isAccountsSubmitted ? "Completed" : "Pending";
    }
    if (task.tab === "project_incharge") {
      return task.lead?.isExecutionSubmitted ? "Completed" : "Pending";
    }
    return "Pending";
  };

  const coordinatorProjectStats = useMemo(() => {
    const isProjectCoordinator = dbUser?.category === "Project Coordinator";
    if (!isProjectCoordinator) return null;

    const email = user?.email?.toLowerCase()?.trim();
    const assignedLeads = leads.filter((l) => {
      return typeof l.projectInchargeEmail === "string" &&
        l.projectInchargeEmail.toLowerCase().trim() === email;
    });

    const hasTaskExecutionStarted = (l: Lead) => {
      return l.status === "Won" || !!(
        l.isStep1Submitted || l.isStep2Submitted || l.isStep3Submitted ||
        l.isStep4Submitted || l.isStep5Submitted || l.isStep6Submitted ||
        l.isStep7Submitted || l.isStep8Submitted || l.isStep9Submitted ||
        l.isStep10Submitted || l.isStep11Submitted || l.isStep12Submitted ||
        l.isStep13Submitted
      );
    };

    const pending = assignedLeads.filter((l) => {
      const isCompleted = l.status === "Completed" || l.isExecutionSubmitted === true;
      return !isCompleted && !hasTaskExecutionStarted(l);
    }).length;

    const inProgress = assignedLeads.filter((l) => {
      const isCompleted = l.status === "Completed" || l.isExecutionSubmitted === true;
      return !isCompleted && hasTaskExecutionStarted(l);
    }).length;

    const completed = assignedLeads.filter((l) => {
      return l.status === "Completed" || l.isExecutionSubmitted === true;
    }).length;

    const total = assignedLeads.length;

    return {
      pending,
      inProgress,
      completed,
      total,
    };
  }, [leads, dbUser, role, user]);

  const allSystemTasks = useMemo(() => {
    // Process all leads
    const leadTasks = leads.flatMap((l) => {
      if (
        l.status === "Lost" ||
        l.status === "Converted" ||
        l.status === "Completed"
      ) {
        return [];
      }

      const hasReachedFurtherSteps = l.status === "Won";

      const isProjectCoordinator = dbUser?.category === "Project Coordinator";
      const activeSteps = SEQUENCE.filter((step, index) => {
        if (isProjectCoordinator && step.label === "Final Execution Review") return false;
        if (!hasReachedFurtherSteps && index >= 3) return false;
        if (hasReachedFurtherSteps && index < 3) return false;
        if (step.condition && !step.condition(l)) return false;

        const isSubmitted = (l as any)[step.submitField];
        return !isSubmitted;
      });

      return activeSteps.map((step) => {
        let dateValue = l.updatedAt;
        if (l.stepAssignmentDates && l.stepAssignmentDates[step.label]) {
          dateValue = l.stepAssignmentDates[step.label];
        }

        const assignedEmail = (l as any)[step.emailField];
        const assignedName = (l as any)[step.nameField] || "Unassigned";

        let dueDate = null;
        if (step.label === "Section B: Site Survey") {
          dueDate = l.siteVisitDate || l.planSiteVisitDate;
        } else if (step.label === "Section C: Sales Follow-up") {
          dueDate = l.nextFollowUpDate;
        } else if (
          step.stepId &&
          l.stepDueDates &&
          l.stepDueDates[step.stepId]
        ) {
          dueDate = l.stepDueDates[step.stepId];
        }

        if (!dueDate) {
          const baseDate = dateValue
            ? dateValue.seconds
              ? new Date(dateValue.seconds * 1000)
              : new Date(dateValue)
            : new Date();
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + 1);
          dueDate = nextDay;
        }

        return {
          lead: l,
          label: step.label,
          tab: step.tab as Tab,
          stepId: step.stepId,
          assignedDate: dateValue,
          dueDate: dueDate,
          assigneeName: assignedName,
          assigneeEmail: assignedEmail || "",
          isPaymentTask: false,
        };
      });
    });

    // Also include pending payments
    const paymentTasks = pendingPayments.flatMap((p) => {
      const associatedLead = leads.find((l) => l.id === p.leadId);
      if (!associatedLead) return [];

      // Hide legacy duplicate advance payment tasks
      if (
        p.paymentType === "Advance" &&
        (associatedLead.accAssignee || associatedLead.accAssigneeEmail)
      ) {
        return [];
      }

      const createdDate = p.recordedAt
        ? p.recordedAt.seconds
          ? new Date(p.recordedAt.seconds * 1000)
          : new Date(p.recordedAt)
        : new Date();

      let assigneeEmail = p.recordedBy || "";
      const assigneeLower = (p.confirmationAssignee || "")
        .toLowerCase()
        .trim();
      if (assigneeLower) {
        let matchedUser = users.find(
          (u) => (u.name || "").toLowerCase().trim() === assigneeLower,
        );
        if (!matchedUser) {
          matchedUser = users.find((u) => {
            const uName = (u.name || "").toLowerCase().trim();
            return (
              uName.includes(assigneeLower) || assigneeLower.includes(uName)
            );
          });
        }

        if (matchedUser) {
          assigneeEmail = matchedUser.email || "";
        } else if (
          associatedLead &&
          (associatedLead.accAssignee || "").toLowerCase().trim() ===
            assigneeLower
        ) {
          assigneeEmail = associatedLead.accAssigneeEmail || assigneeEmail;
        }
      }

      return [{
        lead: associatedLead,
        label:
          p.paymentType === "Other"
            ? `Confirm Payment: Other (₹${p.amount.toLocaleString()})`
            : `Confirm ${p.paymentType} Payment (₹${p.amount.toLocaleString()})`,
        tab: "accounts" as Tab,
        payment: p,
        assignedDate: p.recordedAt,
        dueDate: createdDate,
        assigneeName: p.confirmationAssignee || "Unassigned",
        assigneeEmail: assigneeEmail,
        isPaymentTask: true,
      }];
    });

    return [...leadTasks, ...paymentTasks];
  }, [leads, pendingPayments, users]);

  const parseToDate = (val: any): Date => {
    if (!val) return new Date();
    try {
      if (val instanceof Date) return val;
      if (typeof val === "object" && val.seconds) {
        return new Date(val.seconds * 1000);
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        return new Date();
      }
      return d;
    } catch (e) {
      return new Date();
    }
  };

  const stats = {
    total: pendingTasks.length,
    overdue: pendingTasks.filter((t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateObj = parseToDate(t.dueDate);
      const dueDay = new Date(dueDateObj.getTime());
      dueDay.setHours(0, 0, 0, 0);
      return dueDay.getTime() < today.getTime();
    }).length,
    dueToday: pendingTasks.filter((t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = parseToDate(t.dueDate);
      const dueDay = new Date(dueDate.getTime());
      dueDay.setHours(0, 0, 0, 0);
      return dueDay.getTime() === today.getTime();
    }).length,
    upcoming: pendingTasks.filter((t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = parseToDate(t.dueDate);
      const dueDay = new Date(dueDate.getTime());
      dueDay.setHours(0, 0, 0, 0);
      return dueDay.getTime() > today.getTime();
    }).length,
  };

  const filteredTasks = pendingTasks
    .filter((t) => {
      if (!t) return false;

      // Filter by Priority/Status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateObj = parseToDate(t.dueDate);
      const dueDay = new Date(dueDateObj.getTime());
      dueDay.setHours(0, 0, 0, 0);

      const isOverdue = dueDay.getTime() < today.getTime();
      const isToday = dueDay.getTime() === today.getTime();

      if (statusFilter === "overdue" && !isOverdue) return false;
      if (statusFilter === "today" && !isToday) return false;
      if (statusFilter === "upcoming" && (isOverdue || isToday)) return false;

      const customerName = (t.lead?.customerName || "").toLowerCase();
      const leadId = (t.lead?.leadId || "").toLowerCase();
      const label = (t.label || "").toLowerCase();
      const assigneeName = (t.assigneeName || "").toLowerCase();
      const assigneeEmail = (t.assigneeEmail || "").toLowerCase();
      const query = (searchQuery || "").toLowerCase();
      return (
        customerName.includes(query) ||
        leadId.includes(query) ||
        label.includes(query) ||
        assigneeName.includes(query) ||
        assigneeEmail.includes(query)
      );
    })
    .sort((a, b) => {
      return (
        parseToDate(a.dueDate).getTime() - parseToDate(b.dueDate).getTime()
      );
    });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode, selectedLeadId, statusFilter]);

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

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
        remarks: editRemarks,
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
    if (
      !window.confirm("Are you sure you want to REJECT this payment entry?")
    ) {
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
  
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
      "bg-blue-50 text-blue-700 ring-blue-600/10",
      "bg-amber-50 text-amber-700 ring-amber-600/10",
      "bg-rose-50 text-rose-700 ring-rose-600/10",
      "bg-purple-50 text-purple-700 ring-purple-600/10",
      "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
    ];
    let sum = 0;
    const cleanName = name || "Unassigned";
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getInitials = (name: string) => {
    if (!name || name === "Unassigned") return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getDueDurationText = (dueDate: Date) => {
    const now = new Date();
    // Neutralize hours to do pure date comparative calculation
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d2 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      if (overdueDays === 1) return "Overdue by 1 day";
      return `Overdue by ${overdueDays} days`;
    } else {
      if (diffDays === 0) return "Due today";
      if (diffDays === 1) return "Due tomorrow";
      return `Due in ${diffDays} days`;
    }
  };

  const getStepGroupStyles = (tab: string, label: string) => {
    const cleanTab = tab || "";
    if (cleanTab === "pre_sales") {
      return "bg-purple-50 text-purple-700 border-purple-100 ring-1 ring-purple-600/10";
    }
    if (cleanTab === "survey") {
      return "bg-sky-50 text-sky-700 border-sky-100 ring-1 ring-sky-600/10";
    }
    if (cleanTab === "sales") {
      return "bg-pink-50 text-pink-700 border-pink-100 ring-1 ring-pink-600/10";
    }
    if (cleanTab === "financials") {
      return "bg-blue-50 text-blue-700 border-blue-100 ring-1 ring-blue-600/10";
    }
    if (cleanTab === "accounts") {
      return "bg-teal-50 text-teal-700 border-teal-100 ring-1 ring-teal-600/10";
    }
    if (cleanTab === "execution") {
      return "bg-indigo-50 text-indigo-700 border-indigo-100 ring-1 ring-indigo-600/10";
    }
    if (cleanTab === "project_incharge") {
      return "bg-violet-50 text-violet-700 border-violet-100 ring-1 ring-violet-600/10";
    }
    return "bg-slate-50 text-slate-700 border-slate-100 ring-1 ring-slate-600/10";
  };

  const formatDate = (val: any) => {
    if (!val) return "N/A";
    try {
      const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
      return format(date, "MMM d, yyyy");
    } catch (e) {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-100 animate-pulse rounded-2xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with high visual design */}
      <div className="bg-gradient-to-tr from-indigo-950 via-slate-900 to-zinc-950 text-white rounded-[2rem] p-6 md:p-10 shadow-xl border border-indigo-950/20 relative overflow-hidden">
        {/* Abstract design elements to eliminate tech larping, pure gorgeous styling */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mb-10"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-black tracking-widest uppercase">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              Dynamic Workspace
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
              Operational Task Sheet
            </h1>
            <p className="text-sm font-medium text-slate-300 max-w-xl leading-relaxed">
              {viewMode === "mine"
                ? "Your real-time personalized operational queue. Execute pending tasks immediately to keep active installation pipelines moving on-time."
                : viewMode === "incharge"
                  ? "Project Incharge Oversight. Track step-level actions, delegate assignments, and monitor active operational bottlenecks on your teams."
                  : "Global Pipeline Monitor. Unified live operational dashboard, tracking active operational state and payment releases across all projects."}
            </p>
          </div>

          <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl shrink-0 select-none">
            <button
              onClick={() => {
                setViewMode("mine");
                setStatusFilter("all");
              }}
              className={`px-4.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                viewMode === "mine"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              My Focus
            </button>
            <button
              onClick={() => {
                setViewMode("incharge");
                setStatusFilter("all");
              }}
              className={`px-4.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                viewMode === "incharge"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Project Incharge
            </button>
            {role === "Admin" && (
              <button
                onClick={() => {
                  setViewMode("all");
                  setStatusFilter("all");
                }}
                className={`px-4.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  viewMode === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Global Pipeline
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Metric Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total */}
        <button
          onClick={() => setStatusFilter("all")}
          className={`text-left p-5 rounded-3xl border transition-all relative overflow-hidden group/card ${
            statusFilter === "all"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-500 ring-offset-2"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${statusFilter === "all" ? "bg-indigo-500/30 text-white" : "bg-indigo-50 text-indigo-600 group-hover/card:bg-indigo-100 transition-colors"}`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusFilter === "all" ? "bg-white/10 text-indigo-100" : "bg-indigo-50/60 text-indigo-600"}`}>
              Queue
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black tracking-tight leading-none mb-1">
              {stats.total}
            </h3>
            <p className={`text-xs font-bold ${statusFilter === "all" ? "text-indigo-100" : "text-slate-400"}`}>
              Total Pending Tasks
            </p>
          </div>
        </button>

        {/* Metric 2: Overdue */}
        <button
          onClick={() => setStatusFilter("overdue")}
          className={`text-left p-5 rounded-3xl border transition-all relative overflow-hidden group/card ${
            statusFilter === "overdue"
              ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100 ring-2 ring-rose-500 ring-offset-2"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${statusFilter === "overdue" ? "bg-rose-500/30 text-white" : "bg-rose-50 text-rose-600 group-hover/card:bg-rose-100 transition-colors"}`}>
              <Clock className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusFilter === "overdue" ? "bg-white/10 text-rose-100 animate-pulse" : "bg-rose-50/60 text-rose-600 font-extrabold"}`}>
              {stats.overdue > 0 ? "LATE" : "CLEAN"}
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black tracking-tight leading-none mb-1 flex items-center gap-1.5">
              {stats.overdue}
              {stats.overdue > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping inline-block" />}
            </h3>
            <p className={`text-xs font-bold ${statusFilter === "overdue" ? "text-rose-100" : "text-slate-400"}`}>
              Requires Immediate Action
            </p>
          </div>
        </button>

        {/* Metric 3: Today */}
        <button
          onClick={() => setStatusFilter("today")}
          className={`text-left p-5 rounded-3xl border transition-all relative overflow-hidden group/card ${
            statusFilter === "today"
              ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100 ring-2 ring-amber-500 ring-offset-2"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${statusFilter === "today" ? "bg-amber-500/30 text-white" : "bg-amber-50 text-amber-600 group-hover/card:bg-amber-100 transition-colors"}`}>
              <Activity className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusFilter === "today" ? "bg-white/10 text-amber-100 animate-pulse" : "bg-amber-50/60 text-amber-600"}`}>
              TODAY
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black tracking-tight leading-none mb-1">
              {stats.dueToday}
            </h3>
            <p className={`text-xs font-bold ${statusFilter === "today" ? "text-amber-100" : "text-slate-400"}`}>
              Due Before Day Closes
            </p>
          </div>
        </button>

        {/* Metric 4: Upcoming */}
        <button
          onClick={() => setStatusFilter("upcoming")}
          className={`text-left p-5 rounded-3xl border transition-all relative overflow-hidden group/card ${
            statusFilter === "upcoming"
              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 ring-2 ring-emerald-500 ring-offset-2"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${statusFilter === "upcoming" ? "bg-emerald-500/30 text-white" : "bg-emerald-50 text-emerald-600 group-hover/card:bg-emerald-100 transition-colors"}`}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusFilter === "upcoming" ? "bg-white/10 text-emerald-100" : "bg-emerald-50/60 text-emerald-600"}`}>
              SCHEDULED
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black tracking-tight leading-none mb-1">
              {stats.upcoming}
            </h3>
            <p className={`text-xs font-bold ${statusFilter === "upcoming" ? "text-emerald-100" : "text-slate-400"}`}>
              On Track & Pipeline Tasks
            </p>
          </div>
        </button>
      </div>

      {/* Project Count Summary */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Project Count Summary</h4>
              <p className="text-xs font-semibold text-slate-400">
                {(dbUser?.category === "Project Coordinator")
                  ? "Consolidated status of projects formally assigned to you"
                  : "Consolidated perspective of active and total pipeline projects"}
              </p>
            </div>
          </div>
          {(dbUser?.category === "Project Coordinator") && coordinatorProjectStats ? (
            <div className="flex items-center gap-6 divide-x divide-slate-200">
              <div className="text-center px-4">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Pending</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{coordinatorProjectStats.pending}</p>
              </div>
              <div className="text-center px-4 pl-6">
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">In Progress (Processing)</span>
                <p className="text-2xl font-black text-indigo-600 mt-1">{coordinatorProjectStats.inProgress}</p>
              </div>
              <div className="text-center px-4 pl-6">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Completed</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{coordinatorProjectStats.completed}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6 divide-x divide-slate-200">
              <div className="text-center px-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Projects</span>
                <p className="text-2xl font-black text-slate-800 mt-1">{projectStats.globalTotal}</p>
              </div>
              <div className="text-center px-4 pl-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pending Projects</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{projectStats.globalPending}</p>
              </div>
              {viewMode !== "all" && (
                <div className="text-center px-4 pl-6 hidden md:block">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">My Active Projects</span>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{projectStats.contextualCount}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Availability Calendar Section - shown only in Project Control view for Admin or Project Coordinator / Site Incharge */}
      {viewMode === "incharge" && (role === "Admin" || user?.email === 'hemant.tyagi@bharatamtechnology.com' || dbUser?.category === "Project Coordinator" || dbUser?.category === "Site Incharge/Supervisor") && (
        <div className="space-y-4 my-2">
          <button
            onClick={() => setShowAvailabilityCalendar(!showAvailabilityCalendar)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
            id="toggle-availability-calendar-btn"
          >
            <Calendar className="w-4 h-4" />
            {showAvailabilityCalendar ? "Hide Team Availability Calendar" : "Show Team Availability Calendar"}
          </button>
          {showAvailabilityCalendar && (
            <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
              <AvailabilityCalendar 
                users={users} 
                allTasks={allSystemTasks} 
                onSelectTask={(leadId, stepId, tab) => onSelectTask(leadId, stepId, tab)} 
              />
            </div>
          )}
        </div>
      )}

      {/* Control and Toolbar Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 border border-slate-200/80 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80 font-sans">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities, names, leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 font-semibold"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
          {viewMode === "incharge" && (
            <div className="relative w-full sm:w-60 group/select font-sans">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="all">All Assigned Projects ({inchargeLeads.length})</option>
                {inchargeLeads.map((l) => {
                  const leadPendingCount = allInchargePendingTasks.filter(
                    (t) => t.lead.id === l.id,
                  ).length;
                  return (
                    <option key={l.id} value={l.id}>
                      {l.customerName} ({leadPendingCount})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* List or Group View Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setGroupByProject(false)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 ${
                !groupByProject
                  ? "bg-white text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-700 font-medium"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Classic List
            </button>
            <button
              onClick={() => setGroupByProject(true)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 ${
                groupByProject
                  ? "bg-white text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-700 font-medium"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Project View
            </button>
          </div>

          {groupByProject && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 gap-1 dev-expand-collapse">
              <button
                onClick={() => {
                  const allProjIds: Record<string, boolean> = {};
                  filteredTasks.forEach((t) => {
                    if (t.lead?.id) allProjIds[t.lead.id] = true;
                  });
                  setExpandedProjects(allProjIds);
                }}
                className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all bg-white text-indigo-600 shadow-sm hover:bg-slate-50/80"
              >
                Expand All
              </button>
              <button
                onClick={() => setExpandedProjects({})}
                className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all text-slate-500 hover:text-slate-700 font-bold"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {groupByProject ? (
        <div className="space-y-6">
          {/* Collaborative, grouped projects layout */}
          {(() => {
            // Grouping tasks by project
            const grouped = filteredTasks.reduce((acc, task) => {
              const leadId = task.lead.id;
              if (!acc[leadId]) {
                acc[leadId] = {
                  lead: task.lead,
                  tasks: [],
                };
              }
              acc[leadId].tasks.push(task);
              return acc;
            }, {} as Record<string, { lead: Lead; tasks: typeof filteredTasks }>);

            const groups = Object.values(grouped);

            if (groups.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-16 text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">No active projects matching criteria</h4>
                  <p className="text-xs font-semibold text-slate-400 max-w-sm mx-auto mt-1">
                    Try adjusting your filters, modifying search keywords, or switching from 'My Focus' focus views.
                  </p>
                </div>
              );
            }

            return groups.map((g, projectIdx) => {
              const pendingCount = g.tasks.length;
              const isExpanded = !!expandedProjects[g.lead.id];
              return (
                <motion.div
                  key={g.lead.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: projectIdx * 0.03 }}
                  className="bg-white border border-slate-200/80 rounded-[1.8rem] shadow-sm overflow-hidden"
                >
                  {/* Outer Project Header Card - Interactive Accordion Toggle */}
                  <div
                    onClick={() => toggleProjectExpand(g.lead.id)}
                    className="p-6 md:p-8 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-100/50 select-none transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">
                            {g.lead.customerName}
                          </h3>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700/80 text-[9px] font-black uppercase rounded-md tracking-tighter">
                            {g.lead.finalKw || g.lead.requiredKw || "N/A"} KW
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] font-semibold text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                          <span className="truncate max-w-[180px]" title={g.lead.address}>{g.lead.locationType || g.lead.address || "Location unassigned"}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[9px] font-mono font-bold bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded tracking-wider uppercase">
                            REF: {(g.lead.leadId || "").slice(0, 8) || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                      <div className="text-right hidden sm:block">
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Project Incharge</span>
                        <p className="text-xs font-bold text-slate-700">{g.lead.projectInchargeName || g.lead.projectAssignee || "Not assigned"}</p>
                      </div>
                      <div className="bg-amber-500 text-white font-black text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 leading-none shadow-sm shadow-amber-500/10 uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5 animate-pulse shrink-0" />
                        <span>{pendingCount} Task{pendingCount > 1 ? "s" : ""}</span>
                      </div>
                      <div className={`w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0 transition-transform duration-300 shadow-sm ${isExpanded ? "rotate-180" : ""}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Tasks list nested under this Project - collapsible with exit animation */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="divide-y divide-slate-100 bg-white overflow-hidden"
                      >
                        {g.tasks.map((task) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDateObj = parseToDate(task.dueDate);
                          const dueDay = new Date(dueDateObj.getTime());
                          dueDay.setHours(0, 0, 0, 0);
                          const isOverdue = dueDay.getTime() < today.getTime();
                          const isToday = dueDay.getTime() === today.getTime();

                          const isProjectCoordinator = dbUser?.category === "Project Coordinator";
                          if (isProjectCoordinator) {
                            const status = getTaskStatus(task);
                            return (
                              <div
                                key={`${task.lead.id}-${task.label}-${task.assigneeEmail}`}
                                className="p-5 flex flex-row justify-between items-center gap-4 hover:bg-slate-50/40 transition-all font-sans border-b border-slate-100 last:border-b-0"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">
                                        {task.label}
                                      </h4>
                                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${getStepGroupStyles(task.tab, task.label)}`}>
                                        {task.tab.replace("_", " ")}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5 font-bold">
                                      {task.stepId ? `Phase Step ${task.stepId}` : "Operational Pipeline step"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 select-none">
                                  <span className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-xl tracking-wider border ${
                                    status === "Completed" || status === "Confirmed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : status === "Assigned-Back" || status === "In Progress"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : status === "Assigned"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`${task.lead.id}-${task.label}-${task.assigneeEmail}`}
                              className="p-5 md:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-slate-50/40 transition-all font-sans"
                            >
                              <div className="flex items-start gap-4">
                                <div
                                  className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl border shrink-0 ${
                                    isOverdue
                                      ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse"
                                      : isToday
                                        ? "bg-amber-50 border-amber-100 text-amber-600"
                                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                  }`}
                                >
                                  <span className="text-[8px] font-black uppercase leading-tight mb-0.5">
                                    {dueDateObj.getDate()}
                                  </span>
                                  <span className="text-[7px] font-black uppercase leading-none">
                                    {format(dueDateObj, "MMM")}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">
                                      {task.label}
                                    </h4>
                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${getStepGroupStyles(task.tab, task.label)}`}>
                                      {task.tab.replace("_", " ")}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1.5 font-bold">
                                    {task.stepId ? `Phase Step ${task.stepId}` : "Operational Pipeline step"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto mt-2 lg:mt-0">
                                {/* Staff Assigned */}
                                <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-100 shrink-0">
                                  <div className={`w-6 h-6 rounded-md ${getAvatarColor(task.assigneeName)} flex items-center justify-center text-[9px] font-black uppercase`}>
                                    {getInitials(task.assigneeName)}
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Owner Target</p>
                                    <p className="text-xs font-bold text-slate-700 leading-normal">{task.assigneeName}</p>
                                  </div>
                                </div>

                                {/* Clock deadlines */}
                                <div className="flex flex-col shrink-0 min-w-[130px]">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Due Details</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className={`w-3 h-3 ${isOverdue ? "text-rose-500" : "text-slate-400"}`} />
                                    <span className={`text-[11px] font-black ${isOverdue ? "text-rose-600" : isToday ? "text-amber-600" : "text-slate-700"}`}>
                                      {getDueDurationText(dueDateObj)}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 mt-1 leading-none">Assign: {formatDate(task.assignedDate)}</span>
                                </div>

                                {/* Operations */}
                                <div className="sm:ml-auto shrink-0 select-none">
                                  {task.isMine ? (
                                    <button
                                      onClick={() => {
                                        if (task.isPaymentTask) {
                                          setSelectedPaymentTask(task.payment || null);
                                        } else {
                                          onSelectTask(task.lead.id, task.stepId, task.tab);
                                        }
                                      }}
                                      className="flex items-center gap-1 px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 bg-indigo-600 hover:bg-zinc-900 text-white leading-none"
                                    >
                                      Execute
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 text-slate-400 text-[9px] font-black uppercase rounded-lg">
                                      Read-Only
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            });
          })()}
        </div>
      ) : (
        /* Classic List/Table View with Highly-polished Modern Cards */
        <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {(dbUser?.category === "Project Coordinator") ? (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Task / Activity Name
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Customer Project
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Current Status
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">
                        Urgency
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Activity & Phase Detail
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Customer Project
                      </th>
                      {(role === "Admin" || viewMode === "incharge") && (
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Assignee Target
                        </th>
                      )}
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Deadlines & Grace
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Operation
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {paginatedTasks.length > 0 ? (
                    paginatedTasks.map((task, idx) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDateObj = parseToDate(task.dueDate);
                      const dueDay = new Date(dueDateObj.getTime());
                      dueDay.setHours(0, 0, 0, 0);
                      const isOverdue = dueDay.getTime() < today.getTime();
                      const isToday = dueDay.getTime() === today.getTime();

                      const isProjectCoordinator = dbUser?.category === "Project Coordinator";
                      if (isProjectCoordinator) {
                        const status = getTaskStatus(task);
                        return (
                          <motion.tr
                            key={`${task.lead.id}-${task.label}-${task.assigneeEmail}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.02 }}
                            className="group hover:bg-slate-50/60 transition-all font-sans"
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900 leading-none mb-1 shadow-none">
                                    {task.label}
                                  </p>
                                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${getStepGroupStyles(task.tab, task.label)}`}>
                                    {task.tab.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div>
                                <p className="text-sm font-extrabold text-slate-900 leading-none mb-1 shadow-none">
                                  {task.lead.customerName}
                                </p>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {(task.lead.leadId || "").slice(0, 8) || "N/A"}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-xl tracking-wider border inline-block ${
                                status === "Completed" || status === "Confirmed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : status === "Assigned-Back" || status === "In Progress"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : status === "Assigned"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}>
                                {status}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      }

                      return (
                        <motion.tr
                          key={`${task.lead.id}-${task.label}-${task.assigneeEmail}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.02 }}
                          className="group hover:bg-slate-50/60 transition-all font-sans"
                        >
                          <td className="px-8 py-6">
                            <div
                              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border ${
                                isOverdue
                                  ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse"
                                  : isToday
                                    ? "bg-amber-50 border-amber-100 text-amber-600"
                                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                              }`}
                            >
                              <span className="text-[9px] font-black uppercase leading-none mb-0.5">
                                {isOverdue ? "LATE" : isToday ? "NOW" : "OK"}
                              </span>
                              <span className="text-lg font-black leading-none">
                                {dueDateObj.getDate()}
                              </span>
                              <span className="text-[8px] font-black uppercase leading-none">
                                {format(dueDateObj, "MMM")}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                  {task.label}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${getStepGroupStyles(task.tab, task.label)}`}>
                                  {task.tab.replace("_", " ")}
                                </span>
                                {task.isPaymentTask && (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[9px] font-black uppercase rounded border border-emerald-200">
                                    Needs Account Confirmation
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
                          <td className="px-8 py-6 font-sans">
                            <div>
                              <p className="text-sm font-extrabold text-slate-900 leading-none mb-1 shadow-none">
                                {task.lead.customerName}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {(task.lead.leadId || "").slice(0, 8) || "N/A"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {task.lead.finalKw || task.lead.requiredKw || "N/A"} KW
                                </span>
                              </div>
                            </div>
                          </td>
                          {(role === "Admin" || viewMode === "incharge") && (
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg ${getAvatarColor(task.assigneeName)} flex items-center justify-center text-[10px] font-black uppercase shrink-0`}>
                                  {getInitials(task.assigneeName)}
                                </div>
                                <div className="leading-tight">
                                  <p className="text-xs font-black text-slate-900">
                                    {task.assigneeName}
                                  </p>
                                  <p className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">
                                    {task.assigneeEmail}
                                  </p>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-8 py-6">
                            <div className="space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100 max-w-[180px]">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className={`text-[9px] font-black uppercase text-slate-500`}>
                                  {getDueDurationText(dueDateObj)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                <Calendar className="w-3 h-3 text-slate-300" />
                                <span className="text-[9px] font-bold text-slate-400">
                                  Assign: {formatDate(task.assignedDate)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-end select-none">
                              {task.isMine ? (
                                <button
                                  onClick={() => {
                                    if (task.isPaymentTask) {
                                      setSelectedPaymentTask(
                                        task.payment || null,
                                      );
                                    } else {
                                      onSelectTask(
                                        task.lead.id,
                                        task.stepId,
                                        task.tab,
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-100 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex-nowrap shrink-0"
                                >
                                  Execute
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 text-slate-400 text-[9px] font-black uppercase rounded-lg tracking-wider">
                                  {task.assigneeName}
                                </span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={role === "Admin" ? 6 : 5}
                        className="px-8 py-20 text-center"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-indigo-200" />
                          </div>
                          <div>
                            <p className="text-xl font-black text-slate-900">
                              Workspace Clear
                            </p>
                            <p className="text-sm font-semibold text-slate-400 mt-1 max-w-xs mx-auto">
                              No pending tasks in this filter queue. Check back later for new items.
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

          {/* Pagination Controls inside the main wrapper */}
          {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
              <span className="text-xs font-semibold text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {totalItems === 0 ? 0 : startIndex + 1}
                </span>{" "}
                to <span className="font-bold text-slate-700">{endIndex}</span> of{" "}
                <span className="font-bold text-slate-700">{totalItems}</span>{" "}
                matching activities
              </span>
              <div className="flex items-center gap-1.5 font-sans">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl text-slate-500 bg-white hover:bg-slate-100 border border-slate-200/80 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all"
                  title="First Page font-sans"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200/80 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5 font-sans" /> Prev
                </button>

                {/* Pagination indicators (compact, e.g. "Page X of Y") */}
                <div className="hidden md:flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = currentPage;
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-sm font-sans"
                            : "text-slate-500 hover:bg-slate-100 font-sans"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <span className="md:hidden text-xs font-bold text-slate-500 mx-2 font-sans">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200/80 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 font-sans" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl text-slate-500 bg-white hover:bg-slate-100 border border-slate-200/80 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all"
                  title="Last Page font-sans"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    Payment Confirmation Request
                  </span>
                  <h3 className="text-xl font-black tracking-tight">
                    {selectedPaymentTask.leadName}
                  </h3>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                      Payment Type
                    </label>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                      Entry Date
                    </label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                    UTR / Transaction Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={editUtr}
                    onChange={(e) => setEditUtr(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                    Original Notes / Remarks
                  </label>
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
                      "Approve & Post"
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
