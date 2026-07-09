import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { leadService } from "../services/leadService";
import { formatCreatorName } from "../utils/creatorUtils";
import { userService } from "../services/userService";
import { paymentService } from "../services/paymentService";
import { commissionService } from "../services/commissionService";
import { kwService } from "../services/kwService";
import { Lead, AppUser, Tab, PaymentRecord, CommissionRole } from "../types";
import AvailabilityCalendar from "./AvailabilityCalendar";
import {
  ArrowLeft,
  Save,
  Trash2,
  ExternalLink,
  Info,
  Settings,
  CreditCard,
  HardDrive,
  FileCheck,
  Calendar,
  Shield,
  User as UserIcon,
  MapPin,
  Phone,
  Mail,
  Zap,
  Activity,
  CheckCircle2,
  Ban,
  Clock,
  AlertTriangle,
  AlertCircle,
  X,
  Upload,
  BarChart3,
  FileText,
  Camera,
  Lock,
  ChevronDown,
  Users,
  UserPlus,
  RotateCcw,
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  FolderOpen,
  Search,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { RATE_TABLE } from "../constants/rates";
import { storageService } from "../services/storageService";
import { storage, db, auth } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
} from "firebase/firestore";

import { User } from "firebase/auth";

interface LeadDetailProps {
  leadId: string;
  user: User | null;
  role: AppUser["role"] | null;
  initialStepId?: number;
  initialTab?: Tab;
  onBack: () => void;
}

interface InputFieldProps {
  label: string;
  value: any;
  name: string;
  type?: string;
  options?: (string | { value: string; label: string })[] | null;
  disabled?: boolean;
  placeholder?: string;
  onUpdate: (updates: any) => void;
  multiline?: boolean;
  rows?: number;
  max?: string;
}

const InputField = ({
  label,
  value,
  name,
  type = "text",
  options = null,
  disabled = false,
  placeholder = "",
  onUpdate,
  multiline = false,
  rows = 3,
  max,
}: InputFieldProps) => {
  const getSafeValue = (val: any): any => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number" && isNaN(val)) return "";
    if (String(val) === "NaN") return "";
    return val;
  };

  const [tempValue, setTempValue] = React.useState<any>(getSafeValue(value));
  const isCurrency =
    name?.toLowerCase().includes("rate") ||
    name?.toLowerCase().includes("cost") ||
    name?.toLowerCase().includes("amount") ||
    name?.toLowerCase().includes("discount");
  const isKW = name?.toLowerCase().includes("kw");

  // Update local state when prop changes (e.g. after a save or calculation)
  React.useEffect(() => {
    setTempValue(getSafeValue(value));
  }, [value]);

  const handleLocalChange = (e: any) => {
    const val = type === "checkbox" ? e.target.checked : e.target.value;
    setTempValue(getSafeValue(val));

    // Checkboxes and Selects should update globally immediately
    if (type === "checkbox" || options) {
      onUpdate({ [name]: val });
    }
  };

  const handleBlur = () => {
    if (disabled || type === "checkbox" || options) return;

    let finalVal = tempValue;
    if (type === "number") {
      if (tempValue === "" || tempValue === null || tempValue === undefined) {
        finalVal = 0;
      } else {
        const parsed = parseFloat(tempValue);
        finalVal = isNaN(parsed) ? 0 : parsed;
      }
    } else if (type === "date" && max && finalVal) {
      if (finalVal > max) {
        finalVal = max;
        setTempValue(max);
      }
    }

    // Only update if value actually changed
    if (finalVal !== value) {
      onUpdate({ [name]: finalVal });
    }
  };

  return (
    <div
      className={`space-y-1.5 md:space-y-2 group ${multiline ? "col-span-full" : ""}`}
    >
      <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] md:tracking-[0.15em] group-focus-within:text-blue-600 transition-colors ml-1">
        {label}
      </label>
      <div className="relative">
        {isCurrency && !options && !multiline && (
          <div className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs md:text-sm font-bold z-10 pointer-events-none">
            ₹
          </div>
        )}
        {options ? (
          <div className="relative group/select">
            <select
              value={tempValue || ""}
              onChange={handleLocalChange}
              disabled={disabled}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50/50 border border-slate-200/80 rounded-xl md:rounded-2xl text-xs md:text-sm outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-900 appearance-none disabled:opacity-50 cursor-pointer pr-10 shadow-sm"
            >
              <option value="">Select {label}</option>
              {options
                .filter(Boolean)
                .map(
                  (
                    opt: string | { value: string; label: string },
                    idx: number,
                  ) => {
                    const val =
                      typeof opt === "string" ? opt : opt?.value || "";
                    const lbl =
                      typeof opt === "string" ? opt : opt?.label || "";
                    return (
                      <option key={`${val}-${idx}`} value={val}>
                        {lbl}
                      </option>
                    );
                  },
                )}
            </select>
            <div className="absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within/select:rotate-180">
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
            </div>
          </div>
        ) : multiline ? (
          <textarea
            value={tempValue || ""}
            onChange={handleLocalChange}
            onBlur={handleBlur}
            disabled={disabled}
            rows={rows}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white hover:border-slate-300 focus:bg-white border border-slate-200/80 rounded-xl md:rounded-2xl text-xs md:text-sm outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal shadow-sm resize-none"
          />
        ) : (
          <div className="relative">
            <input
              type={type}
              value={type === "checkbox" ? undefined : (tempValue ?? "")}
              checked={type === "checkbox" ? !!tempValue : undefined}
              onChange={handleLocalChange}
              onBlur={handleBlur}
              readOnly={disabled}
              max={max}
              placeholder={placeholder || `Enter ${label.toLowerCase()}`}
              className={
                type === "checkbox"
                  ? "w-6 h-6 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300 transition-all cursor-pointer accent-blue-600 shadow-sm"
                  : `w-full ${isCurrency ? "pl-9" : "px-4"} ${isKW ? "pr-12" : "px-4"} py-3.5 ${disabled ? "bg-slate-100/50 text-slate-500 cursor-not-allowed" : "bg-white hover:border-slate-300 focus:bg-white"} border border-slate-200/80 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal shadow-sm`
              }
            />
            {isKW && !disabled && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shadow-inner">
                KW
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface DocumentItem {
  key: keyof Lead;
  label: string;
  section: string;
}

const DOCUMENT_MAP: DocumentItem[] = [
  // Site Survey
  { key: "billUrl", label: "Electricity Bill", section: "Site Survey" },
  { key: "drawingUrl", label: "Site Drawing", section: "Site Survey" },
  { key: "gpsUrl", label: "GPS Proof", section: "Site Survey" },
  { key: "meterUrl", label: "Meter Photo", section: "Site Survey" },

  // Project Details
  { key: "loadPropertyUrl", label: "Property Ownership Proof", section: "Project Details" },
  { key: "aadhaarUrl", label: "Aadhaar Card", section: "Project Details" },
  { key: "bankDocUrl", label: "Bank Cancelled Cheque", section: "Project Details" },
  { key: "panUrl", label: "PAN Card", section: "Project Details" },
  { key: "propertyCertUrl", label: "Property Certificate", section: "Project Details" },
  { key: "workAgreementUrl", label: "Work Agreement", section: "Project Details" },
  { key: "modelAgreementUrl", label: "Model Agreement", section: "Project Details" },
  { key: "coApplicantDocUrl", label: "Co-applicant Aadhaar/PAN", section: "Project Details" },

  // Project Control / Steps
  { key: "ssoPassportPhotoUrl", label: "Passport Photo (SSO)", section: "Project Control" },
  { key: "ssoSignatureUrl", label: "Signature (SSO)", section: "Project Control" },
  { key: "newConnectionPhotosUrl", label: "New Connection Photos", section: "Project Control" },
  { key: "executionNewConnectionPhotosUrl", label: "New Connection Proof", section: "Project Control" },
  { key: "s3_loadExtFileUrl", label: "Load Extension Filed Copy", section: "Project Control" },
  { key: "s3_loanFileUrl", label: "Loan Document", section: "Project Control" },
  { key: "s3_discomFileUrl", label: "DISCOM Pre-Install File", section: "Project Control" },
  { key: "s_docCorr_docUrl", label: "Document Correction Proof", section: "Project Control" },
  { key: "s5_preInstallPhotoUrl", label: "Pre-Installation Photo", section: "Project Control" },
  { key: "s_newConn_uploadPhotosUrl", label: "New Connection Photos (Post-Install)", section: "Project Control" },

  // Project Execution / S6 Site Team
  { key: "s5_materialListUrl", label: "Store Material List", section: "Project Execution" },
  { key: "s6_siteRevisitMeasurementUrl", label: "Site Revisit Measurement", section: "Project Execution" },
  { key: "s6_materialListUrl", label: "Site Team Material List", section: "Project Execution" },
  { key: "s6_siteDrawingUrl", label: "Site Drawing", section: "Project Execution" },
  { key: "s6_dispatchedMaterialListUrl", label: "Dispatched Material List", section: "Project Execution" },
  { key: "s6_receivedMaterialListUrl", label: "Received Material List", section: "Project Execution" },
  { key: "s6_workCompletionReportUrl", label: "Work Completion Report", section: "Project Execution" },
  { key: "s6_photoGpsUrl", label: "Site GPS Photo", section: "Project Execution" },
  { key: "s6_photoInverterUrl", label: "Inverter Installed Photo", section: "Project Execution" },
  { key: "s6_photoStructureUrl", label: "Structure with Panels Photo", section: "Project Execution" },
  { key: "s6_photoFoundationUrl", label: "Foundation Photo", section: "Project Execution" },
  { key: "s6_photoEarthingUrl", label: "Earthing Photo", section: "Project Execution" },
  { key: "s6_photoWiringUrl", label: "Wiring Photo", section: "Project Execution" },
  { key: "s6_photoInverterSrNoUrl", label: "Inverter Serial Number Photo", section: "Project Execution" },
  { key: "s6_photoPanelSrNoUrl", label: "Panels Serial Number Photo", section: "Project Execution" },
  { key: "s6_photoDcrCertUrl", label: "DCR Certificate Photo", section: "Project Execution" },
  { key: "s6_photoWorkCompletionCertUrl", label: "Work Completion Certificate Photo", section: "Project Execution" },
  { key: "s7_dcrCertificateUrl", label: "DCR Certificate", section: "Project Execution" },
  { key: "s7_workCompletionCertificateUrl", label: "Work Completion Certificate", section: "Project Execution" },
  { key: "s7_invoiceAdvanceReceiptUrl", label: "Invoice & Advance Receipt", section: "Project Execution" },
  { key: "s8_trainingCertUrl", label: "Training Certificate", section: "Project Execution" },
  { key: "s8_convertedPhotoUrl", label: "Smart Meter Converted Photo", section: "Project Execution" },

  // Deliverables
  { key: "deliverableCustomerSignaturePhotoUrl", label: "Customer Signature on Completion", section: "Deliverables" },
  { key: "deliverableSitePhotosUrl", label: "Site Photos", section: "Deliverables" },
];

export default function LeadDetail({
  leadId,
  user,
  role,
  initialStepId,
  initialTab,
  onBack,
}: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [commissionRoles, setCommissionRoles] = useState<CommissionRole[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || "basic");
  const [currentExecutionStep, setCurrentExecutionStep] = useState(
    initialStepId || 1,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === "project_incharge") {
      const unsubLeads = leadService.subscribeToLeads(
        role,
        user?.email,
        (data) => {
          setAllLeads(data as unknown as Lead[]);
        },
      );
      const unsubPayments = paymentService.subscribeToPendingPayments(
        (pymts) => {
          setPendingPayments(pymts || []);
        },
      );
      return () => {
        unsubLeads();
        unsubPayments();
      };
    }
  }, [activeTab, role, user?.email]);

  // Custom states for Project Control Task Sheet Redesign
  const [activeAssignStep, setActiveAssignStep] = useState<{
    id: number;
    label: string;
    nameField: string;
    emailField: string;
    currentAssigneeName: string;
    currentDueDate: string;
    currentRemark: string;
  } | null>(null);
  const [assignRemarkText, setAssignRemarkText] = useState("");
  const [assignSelectedUser, setAssignSelectedUser] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // States for Handover Workflow
  const [selectedHandoverAdmin, setSelectedHandoverAdmin] = useState("");
  const [selectedNextAssignee, setSelectedNextAssignee] = useState("");
  const [selectedDeliverablesAssignee, setSelectedDeliverablesAssignee] = useState("");

  // States for Document Hub
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docSelectedSection, setDocSelectedSection] = useState("All");

  const confirmationUsers = users.filter(
    (u) => u.role === "Admin" || u.category === "Accountant",
  );

  const isAdminUser = useMemo(() => {
    const userEmail = user?.email?.toLowerCase()?.trim();
    return (
      role === "Admin" || userEmail === "hemant.tyagi@bharatamtechnology.com"
    );
  }, [role, user]);

  const isDeveloperUser = useMemo(() => {
    const userEmail = user?.email?.toLowerCase()?.trim();
    const currentUserObj = users.find(
      (u) => u.email?.toLowerCase()?.trim() === userEmail,
    );
    return (
      (role as string) === "Developer" ||
      userEmail === "hemant.tyagi@bharatamtechnology.com" ||
      currentUserObj?.role?.toLowerCase()?.trim() === "developer"
    );
  }, [role, user, users]);

  const isPrivilegedUser = useMemo(() => {
    return isAdminUser || isDeveloperUser;
  }, [isAdminUser, isDeveloperUser]);

  const loggedInAppUser = useMemo(() => {
    if (!user?.email) return null;
    const normalizedEmail = user.email.toLowerCase().trim();
    return users.find(
      (u) => (u.email || "").toLowerCase().trim() === normalizedEmail,
    );
  }, [users, user]);

  const showCalendar = useMemo(() => {
    return (
      isAdminUser ||
      isDeveloperUser ||
      loggedInAppUser?.category === "Project Coordinator" ||
      loggedInAppUser?.category === "Site Incharge/Supervisor"
    );
  }, [isAdminUser, isDeveloperUser, loggedInAppUser]);

  const allSystemTasks = useMemo(() => {
    if (allLeads.length === 0) return [];

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
        condition: (l: any) => l.loanRequired === "Yes",
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

    const leadTasks = allLeads.flatMap((l) => {
      if (
        l.status === "Lost" ||
        l.status === "Converted" ||
        l.status === "Completed"
      ) {
        return [];
      }

      const hasReachedFurtherSteps = l.status === "Won";

      const isProjectCoordinator =
        loggedInAppUser?.category === "Project Coordinator";
      const activeSteps = SEQUENCE.filter((step, index) => {
        if (isProjectCoordinator && step.label === "Final Execution Review")
          return false;
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

    const paymentTasks = pendingPayments.flatMap((p) => {
      const associatedLead = allLeads.find((l) => l.id === p.leadId);
      if (!associatedLead) return [];

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
      const assigneeLower = (p.confirmationAssignee || "").toLowerCase().trim();
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

      return [
        {
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
        },
      ];
    });

    return [...leadTasks, ...paymentTasks];
  }, [allLeads, pendingPayments, users]);

  const isSteward = useMemo(() => {
    const userEmail = user?.email?.toLowerCase()?.trim();
    if (!userEmail || !lead) return false;

    const currentUserObj = users.find(
      (u) => u.email?.toLowerCase()?.trim() === userEmail,
    );
    const isProjectCoordinator =
      currentUserObj?.category === "Project Coordinator";

    return (
      userEmail === "hemant.tyagi@bharatamtechnology.com" ||
      (lead.projectInchargeEmail || lead.projectAssigneeEmail || "")
        .toLowerCase()
        .trim() === userEmail ||
      isProjectCoordinator
    );
  }, [lead, user, users]);

  const canUserAssignTasks = useMemo(() => {
    const userEmail = user?.email?.toLowerCase()?.trim();
    if (!userEmail || !lead) return false;

    // Check if user is Admin / Developer
    if (isPrivilegedUser) return true;

    // Check if user is Project Coordinator
    const currentUserObj = users.find(
      (u) => u.email?.toLowerCase()?.trim() === userEmail,
    );
    const isProjectCoordinator =
      currentUserObj?.category === "Project Coordinator";

    if (isProjectCoordinator) {
      return true; // Allow any Project Coordinator to assign tasks
    }

    return false; // strictly limited to Project Coordinator and Admin only
  }, [lead, user, users, isPrivilegedUser]);

  const isExecutionFlowFinished = useMemo(() => {
    if (!lead) return false;
    const stepsList = [
      {
        id: 14,
        condition: lead.newConnectionRequired === "Yes",
      },
      {
        id: 1,
        condition: lead.s_docCorr_required === "Yes",
      },
      {
        id: 2,
        condition: lead.loadExtensionRequired === "Yes",
      },
      { id: 3 },
      {
        id: 4,
        condition: lead.loanRequired === "Yes",
      },
      { id: 5 },
      { id: 6 },
      { id: 7 },
      { id: 8 },
      { id: 9 },
      { id: 10 },
      { id: 11 },
      {
        id: 12,
        condition: typeof lead !== "undefined" && lead?.loanRequired === "Yes",
      },
      { id: 13 },
    ].filter((step) => step.condition !== false);

    return stepsList.every(
      (step) => !!(lead as any)[`isStep${step.id}Submitted`],
    );
  }, [lead]);

  const taskMetrics = useMemo(() => {
    if (!lead)
      return {
        total: 0,
        completed: 0,
        delayed: 0,
        onTime: 0,
        pending: 0,
        bypassed: 0,
      };
    const stepsList = [
      {
        id: 14,
        condition: lead.newConnectionRequired === "Yes",
        requiredField: "newConnectionRequired",
      },
      {
        id: 1,
        condition: lead.s_docCorr_required === "Yes",
        requiredField: "s_docCorr_required",
      },
      {
        id: 2,
        condition: lead.loadExtensionRequired === "Yes",
        requiredField: "loadExtensionRequired",
      },
      { id: 3 },
      {
        id: 4,
        condition: lead.loanRequired === "Yes",
        requiredField: "loanRequired",
      },
      { id: 5 },
      { id: 6 },
      { id: 7 },
      { id: 8 },
      { id: 9 },
      { id: 10 },
      { id: 11 },
      {
        id: 12,
        condition: typeof lead !== "undefined" && lead?.loanRequired === "Yes",
        requiredField: "loanRequired",
      },
      { id: 13 },
    ].filter((step) => step.condition !== false);

    const total = stepsList.length;
    let completed = 0;
    let delayed = 0;
    let onTime = 0;
    let pending = 0;
    let bypassed = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    stepsList.forEach((step) => {
      const isComp = !!(lead as any)[`isStep${step.id}Submitted`];
      const isReq = step.requiredField
        ? (lead as any)[step.requiredField] !== "No"
        : true;

      if (!isReq) {
        bypassed++;
        return;
      }

      if (isComp) {
        completed++;
        onTime++;
      } else {
        pending++;
        onTime++;
      }
    });

    return { total, completed, delayed, onTime, pending, bypassed };
  }, [lead]);

  const [remarkModal, setRemarkModal] = useState<{
    isOpen: boolean;
    stepId: number;
    type: "complete" | "assign-back" | "assign" | "revoke";
    title: string;
    description: string;
    btnText: string;
    btnColor: string;
    nameField?: string;
    emailField?: string;
  }>({
    isOpen: false,
    stepId: 0,
    type: "complete",
    title: "",
    description: "",
    btnText: "",
    btnColor: "",
  });
  const [stepRemarkInput, setStepRemarkInput] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "Pending" | "Completed" | "Assigned-Back"
  >("Assigned-Back");

  const ASSIGNEE_FIELDS = useMemo(
    () => [
      { name: "assignedToName", email: "assignedTo" },
      { name: "visitedBy", email: "visitedByEmail" },
      { name: "assignedSales", email: "assignedSalesEmail" },
      { name: "execution_assignedTo", email: "execution_assignedToEmail" },
      { name: "s4_loanAssignedTo", email: "s4_loanAssignedToEmail" },
      {
        name: "s5_storeDispatchAssignedTo",
        email: "s5_storeDispatchAssignedToEmail",
      },
      { name: "s5_discomPreAssignedTo", email: "s5_discomPreAssignedToEmail" },
      { name: "s6_inchargeAssignedTo", email: "s6_inchargeAssignedToEmail" },
      {
        name: "s5_storeInchargeAssignedTo",
        email: "s5_storeInchargeAssignedToEmail",
      },
      { name: "s7_assignedTo", email: "s7_assignedToEmail" },
      { name: "s8_assignedTo", email: "s8_assignedToEmail" },
      { name: "s9_assignedTo", email: "s9_assignedToEmail" },
      { name: "s10_assignedTo", email: "s10_assignedToEmail" },
      { name: "s11_assignedTo", email: "s11_assignedToEmail" },
      { name: "s_newConn_assignedTo", email: "s_newConn_assignedToEmail" },
      { name: "projectAssignee", email: "projectAssigneeEmail" },
      { name: "accAssignee", email: "accAssigneeEmail" },
      { name: "projectInchargeName", email: "projectInchargeEmail" },
    ],
    [],
  );

  const isAssignedToLead = useMemo(() => {
    const userEmail = user?.email?.toLowerCase()?.trim();
    if (!userEmail || !lead) return false;

    const isCreator = lead.createdBy?.toLowerCase().trim() === userEmail;

    // Check if user is ANY kind of assignee on this lead or in members array
    const members = Array.isArray(lead.members)
      ? lead.members.map((m) => m?.toLowerCase()?.trim())
      : [];
    const isMember = members.includes(userEmail);

    const isExplicitAssignee = [
      lead.assignedTo,
      lead.assignedPreSales,
      lead.assignedToEmail,
      lead.assignedSalesEmail,
      lead.projectAssigneeEmail,
      lead.accAssigneeEmail,
      lead.projectInchargeEmail,
      lead.s_docCorr_assignedToEmail,
      lead.s_loadExt_assignedToEmail,
      lead.execution_assignedToEmail,
      lead.s4_loanAssignedToEmail,
      lead.s5_storeDispatchAssignedToEmail,
      lead.s5_discomPreAssignedToEmail,
      lead.s6_inchargeAssignedToEmail,
      lead.s5_storeInchargeAssignedToEmail,
      lead.s6_assignedToEmail,
      lead.s7_assignedToEmail,
      lead.s8_assignedToEmail,
      lead.s9_assignedToEmail,
      lead.s10_assignedToEmail,
      lead.s11_assignedToEmail,
      lead.s_newConn_assignedToEmail,
    ]
      .map((e) => e?.toLowerCase()?.trim())
      .includes(userEmail);

    return isCreator || isMember || isExplicitAssignee;
  }, [lead, user]);

  const isAssignedToStep = useCallback(
    (stepIndex: number) => {
      if (!lead) return false;
      if (isAdminUser) return true;
      const userEmail = user?.email?.toLowerCase()?.trim();
      if (!userEmail) return false;

      const email = userEmail;

      const assignmentFields: Record<number, string> = {
        1: "s_docCorr_assignedToEmail",
        2: "s_loadExt_assignedToEmail",
        3: "execution_assignedToEmail",
        4: "s4_loanAssignedToEmail",
        5: "s5_storeDispatchAssignedToEmail",
        6: "s5_discomPreAssignedToEmail",
        7: "s6_inchargeAssignedToEmail",
        8: "s5_storeInchargeAssignedToEmail",
        9: "s6_assignedToEmail",
        10: "s7_assignedToEmail",
        11: "s8_assignedToEmail",
        12: "s9_assignedToEmail",
        13: "s11_assignedToEmail",
        14: "s_newConn_assignedToEmail",
        15: "s12_assignedToEmail",
      };

      const field = assignmentFields[stepIndex];
      if (!field) return false;

      const assignedEmail = (lead as any)[field]?.toLowerCase()?.trim() || "";

      // Project Incharge (Steward) can edit any step.
      // Assigned users can edit their specific steps.
      if (assignedEmail === email || isSteward) return true;

      // Special cases for non-required steps where steward might manage them
      if (stepIndex === 1 && lead.s_docCorr_required === "No") return isSteward;
      if (stepIndex === 2 && lead.loadExtensionRequired === "No")
        return isSteward;

      return false;
    },
    [lead, isAdminUser, user, isSteward],
  );

  const isStepCompletedAndAssigned = useCallback(
    (
      stage: string,
    ): {
      completed: boolean;
      assigned: boolean;
      nextAssigneeField: string | null;
    } => {
      if (!lead)
        return { completed: false, assigned: false, nextAssigneeField: null };

      const isValSet = (val: any) =>
        typeof val === "string" && val.trim().length > 0;

      switch (stage) {
        case "basic":
          return {
            completed: lead.isBasicSubmitted === true,
            assigned:
              isValSet(lead.assignedPreSales) ||
              isValSet(lead.assignedPreSalesName),
            nextAssigneeField: "Sales Team (Pre-Sales)",
          };
        case "pre_sales":
          // Pre-sales status can be Discussion Done or Not Interested or isPreSalesSubmitted
          return {
            completed:
              lead.isPreSalesSubmitted === true ||
              lead.preSalesStatus === "Discussion Done" ||
              lead.preSalesStatus === "Not Interested",
            assigned:
              isValSet(lead.assignedTo) || isValSet(lead.assignedToName),
            nextAssigneeField: "Site Survey Surveyor",
          };
        case "survey":
          return {
            completed: lead.isSurveySubmitted === true,
            assigned:
              isValSet(lead.assignedSales) || isValSet(lead.assignedSalesEmail),
            nextAssigneeField: "Sales Representative",
          };
        case "sales":
          return {
            completed: lead.isSalesSubmitted === true,
            assigned:
              isValSet(lead.projectAssignee) ||
              isValSet(lead.projectAssigneeEmail),
            nextAssigneeField: "Project Assignee / Incharge",
          };
        case "financials":
          return {
            completed: lead.isFinancialsSubmitted === true,
            assigned:
              isValSet(lead.accAssignee) || isValSet(lead.accAssigneeEmail),
            nextAssigneeField: "Accounts Accountant",
          };
        case "accounts":
          return {
            completed: lead.isAccountsSubmitted === true,
            assigned:
              isValSet(lead.projectInchargeEmail) ||
              isValSet(lead.projectInchargeName),
            nextAssigneeField: "Project Steward (Incharge)",
          };
        default:
          return { completed: true, assigned: true, nextAssigneeField: null };
      }
    },
    [lead],
  );

  const isTabInaccessible = useCallback(
    (
      tab: Tab,
    ): {
      blocked: boolean;
      reason: string | null;
      missingStep: string | null;
      missingAssignee: string | null;
    } => {
      // Under the new rules, any authorized lead participant can access all tabs/sections at any time to view or edit.
      return {
        blocked: false,
        reason: null,
        missingStep: null,
        missingAssignee: null,
      };
    },
    [],
  );

  const canEditTab = useCallback(
    (tab: Tab) => {
      const userEmail = user?.email?.toLowerCase()?.trim();
      if (!userEmail || !lead) return false;

      // Rule 1: Admin and Developer can edit any step/tab at any time
      if (isPrivilegedUser) return true;

      const isProjectCoordinator =
        users.find((u) => u.email?.toLowerCase()?.trim() === userEmail)
          ?.category === "Project Coordinator";

      // Rule 2: Once Project Details (financials tab) is submitted, normal involved users are locked out from editing EARLY tabs
      const isProjectDetailsSubmitted = lead.isFinancialsSubmitted === true;
      if (isProjectDetailsSubmitted) {
        if (
          ["basic", "pre_sales", "survey", "sales", "financials"].includes(tab)
        ) {
          return false;
        }

        if (tab === "project_incharge") {
          const assignedToIncharge =
            (lead.projectInchargeEmail || lead.projectAssigneeEmail || "")
              .toLowerCase()
              .trim() === userEmail;
          if (isProjectCoordinator || assignedToIncharge) return true;
        }

        if (tab === "accounts") {
          const assignedToAccount =
            lead.accAssigneeEmail?.toLowerCase()?.trim() === userEmail;
          if (assignedToAccount) return true;
        }

        if (tab === "execution") {
          return isSteward || isAssignedToLead;
        }

        return false;
      }

      // Rule 3: Before Project Details is submitted, any user who is involved in this particular lead can edit all sections
      if (isAssignedToLead || isSteward) {
        return true;
      }

      return false;
    },
    [lead, user, isPrivilegedUser, isAssignedToLead, isSteward, users],
  );

  const shouldHighlightTab = useCallback(
    (tab: Tab) => {
      if (!lead || !user?.email) return false;
      const userEmail = user.email.toLowerCase().trim();

      const checkHighlight = (
        incomplete: boolean,
        assignedEmail?: string,
        assignedName?: string,
      ) => {
        if (!incomplete) return false;
        const email = assignedEmail?.toLowerCase()?.trim();
        if (email === userEmail) return true;
        // Admins only see highlights for their OWN assigned actions to avoid clutter
        return false;
      };

      const hasReachedProjectDetails = lead.status === "Won";

      if (tab === "survey")
        return checkHighlight(
          !lead.isSurveySubmitted,
          lead.assignedToEmail || lead.assignedTo,
        );
      if (tab === "sales")
        return checkHighlight(
          !lead.isSalesSubmitted,
          lead.assignedSalesEmail || lead.assignedSales,
        );

      // The tabs below should not be highlighted if the lead hasn't reached Project Details (Won status)
      if (!hasReachedProjectDetails) return false;

      if (tab === "financials")
        return checkHighlight(
          !lead.isFinancialsSubmitted,
          lead.projectAssigneeEmail || lead.projectAssignee,
        );
      if (tab === "accounts")
        return checkHighlight(
          !lead.isAccountsSubmitted,
          lead.accAssigneeEmail || lead.accAssignee,
        );

      if (tab === "project_incharge")
        return checkHighlight(
          !lead.isExecutionSubmitted && !!lead.projectInchargeEmail,
          lead.projectInchargeEmail || lead.projectInchargeName,
        );

      if (tab === "execution") {
        if (lead.isExecutionSubmitted) return false;
        const executionEmails = [
          lead.s_docCorr_assignedToEmail,
          lead.s_loadExt_assignedToEmail,
          lead.execution_assignedToEmail,
          lead.s4_loanAssignedToEmail,
          lead.s5_storeDispatchAssignedToEmail,
          lead.s5_discomPreAssignedToEmail,
          lead.s6_inchargeAssignedToEmail,
          lead.s5_storeInchargeAssignedToEmail,
          lead.s6_assignedToEmail,
          lead.s7_assignedToEmail,
          lead.s8_assignedToEmail,
          lead.s9_assignedToEmail,
          lead.s10_assignedToEmail,
          lead.s11_assignedToEmail,
          lead.s_newConn_assignedToEmail,
        ]
          .map((e) => e?.toLowerCase()?.trim())
          .filter(Boolean);
        return executionEmails.includes(userEmail);
      }
      return false;
    },
    [lead, user],
  );

  const shouldHighlightStep = useCallback(
    (stepIndex: number) => {
      if (!lead || !user?.email) return false;
      const userEmail = user.email.toLowerCase().trim();

      const submittedField = `isStep${stepIndex}Submitted` as keyof Lead;
      if (lead[submittedField] === true) return false;

      // Check if user is assigned to this step
      return isAssignedToStep(stepIndex);
    },
    [lead, user, isAssignedToStep],
  );

  const lastSelectedLeadId = useRef<string | null>(null);

  useEffect(() => {
    if (lead) {
      const leadId = lead.id;
      if (lastSelectedLeadId.current !== leadId) {
        lastSelectedLeadId.current = leadId;
        if (!autoSelectedExecutionStep.current && !canEditTab(activeTab)) {
          const tabsList = [
            "survey",
            "sales",
            "financials",
            "accounts",
            "project_incharge",
            "execution",
          ] as Tab[];
          for (const t of tabsList) {
            if (canEditTab(t)) {
              setActiveTab(t);
              break;
            }
          }
        }
      }
    }
  }, [lead, canEditTab, activeTab]);

  const canEditStep = useCallback(
    (stepIndex: number) => {
      if (!lead) return false;

      // Admins can edit any step in any order as long as it isn't submitted yet
      const submittedField = `isStep${stepIndex}Submitted` as keyof Lead;
      if (lead[submittedField] === true) return false;

      const userEmail = user?.email?.toLowerCase()?.trim();
      const isProjectCoordinator =
        users.find((u) => u.email?.toLowerCase()?.trim() === userEmail)
          ?.category === "Project Coordinator";

      if (isAdminUser || isProjectCoordinator) return true;

      // Users can fill details if assigned to the step, even if sequence is not met yet.
      // Sequential logic should strictly be for submission.
      return isAssignedToStep(stepIndex);
    },
    [lead, isAssignedToStep, isAdminUser, user, users],
  );

  const canSubmitStep = useCallback(
    (stepIndex: number) => {
      if (!lead) return false;

      const userEmail = user?.email?.toLowerCase()?.trim();
      const isProjectCoordinator =
        users.find((u) => u.email?.toLowerCase()?.trim() === userEmail)
          ?.category === "Project Coordinator";

      if (isAdminUser || isSteward || isProjectCoordinator) return true;

      // Basic permission check - if assigned, they can submit independently
      return isAssignedToStep(stepIndex);
    },
    [lead, isAssignedToStep, isAdminUser, isSteward, user, users],
  );

  const isReadOnly = useMemo(() => {
    if (isAdminUser) return false;
    return lead?.isSubmitted === true;
  }, [lead, isAdminUser]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "warning" = "success",
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const autoSelectedExecutionStep = useRef<string | null>(null);

  useEffect(() => {
    if (lead && user && activeTab === "execution") {
      const sessionKey = `${lead.id}-${activeTab}`;
      if (autoSelectedExecutionStep.current === sessionKey) return;

      const allSteps = [
        { id: 1, condition: lead.s_docCorr_required === "Yes" },
        { id: 2, condition: lead.loadExtensionRequired === "Yes" },
        { id: 3, condition: true },
        { id: 4, condition: lead.loanRequired === "Yes" },
        { id: 5, condition: true },
        { id: 6, condition: true },
        { id: 7, condition: true },
        { id: 8, condition: true },
        { id: 9, condition: true },
        { id: 10, condition: true },
        { id: 11, condition: true },
        { id: 12, condition: lead.loanRequired === "Yes" },
        { id: 13, condition: true },
      ];

      const assignedSteps = allSteps.filter(
        (s) => s.condition && isAssignedToStep(s.id),
      );
      if (assignedSteps.length > 0) {
        // Prioritize first PENDING assigned step
        const firstPending = assignedSteps.find(
          (s) => !(lead as any)[`isStep${s.id}Submitted`],
        );
        if (firstPending) {
          setCurrentExecutionStep(firstPending.id);
        } else {
          setCurrentExecutionStep(assignedSteps[0].id);
        }
        autoSelectedExecutionStep.current = sessionKey;
      } else {
        // If not assigned specifically (e.g. Admin/Incharge), find first pending overall
        const firstEnabled = allSteps.find((s) => s.condition);
        const fallbackStepId = firstEnabled ? firstEnabled.id : 3;
        const firstPendingOverall = allSteps.find(
          (s) => s.condition && !(lead as any)[`isStep${s.id}Submitted`],
        );
        if (firstPendingOverall) {
          setCurrentExecutionStep(firstPendingOverall.id);
        } else {
          setCurrentExecutionStep(fallbackStepId);
        }
        autoSelectedExecutionStep.current = sessionKey;
      }
    } else {
      autoSelectedExecutionStep.current = null;
    }
  }, [lead, user, activeTab, isAssignedToStep]);

  const getMissingExecutionFields = (stepId: number, lead: any): string[] => {
    const missing: string[] = [];
    if (stepId === 1) {
      if (lead.s_docCorr_required !== "Yes") return [];
      if (!lead.s_docCorr_docUrl) {
        missing.push("Corrected Document File");
      }
      if (!lead.docCorrectionRemark) missing.push("Correction Remark");
    } else if (stepId === 2) {
      if (lead.loadExtensionRequired !== "Yes") return [];
      if (!lead.s3_loadExtFileUrl) missing.push("Load Ext File");
      if (!lead.s3_loadExtFileSubmittedDate)
        missing.push("Load Ext File Submitted Date");
      if (!lead.s3_demandNoteIssued) missing.push("Demand Note Issued (Date)");
      if (!lead.s3_demandDeposited) missing.push("Demand Deposited (Date)");
      if (!lead.s3_discomRemark) missing.push("Remark");
    } else if (stepId === 3) {
      if (!lead.s3_detailsConfirmedByCustomer)
        missing.push("Customer Confirmation");
      if (!lead.s3_aenOfficeName) missing.push("AEN Office Name");
      if (!lead.s3_bankName) missing.push("Bank & Branch Name");
      if (!lead.s3_onlineRegistrationDone)
        missing.push("Online Registration Done");
      if (lead.loanRequired === "Yes" && !lead.s4_loanApplied)
        missing.push("Loan Applied");
      if (lead.loanRequired === "Yes" && !lead.s3_loanFileUrl)
        missing.push("Loan File");
      if (!lead.s3_discomFileUrl) missing.push("Discom File");
    } else if (stepId === 4) {
      if (lead.loanRequired !== "Yes") return [];
      if (!lead.s4_physicalFileToBankDate)
        missing.push("Physical File Submited to Bank Date");
      if (!lead.s4_loanProcessDate) missing.push("Loan Process Date");
      if (!lead.s4_customerSignDate) missing.push("Customer Sign Done Date");
      if (!lead.s4_firstInstallmentReceived)
        missing.push("First Installment Received Status");
      if (lead.s4_firstInstallmentReceived === "Yes") {
        if (!lead.s4_firstInstallmentAmount) missing.push("Amount");
        if (!lead.s4_firstInstallmentUtr) missing.push("UTR No");
        if (!lead.s4_firstInstallmentDate)
          missing.push("First Installment Date");
      }
      if (!lead.s4_loanRemark) missing.push("Remark");
    } else if (stepId === 5) {
      if (!lead.s5_meters) missing.push("Meter Status");
      if (!lead.s5_readyToDispatchDate)
        missing.push("Meter Ready to Dispatch Date");
      if (!lead.s5_dispatchDate) missing.push("Meter Dispatch Date");
      if (!lead.s5_meterDetails)
        missing.push("Meter Details with serial numbers");
    } else if (stepId === 6) {
      if (!lead.s5_fileMeterToDiscomDate)
        missing.push("File & Meter Submited to Discom Date");
      if (!lead.s5_preInstallPhotoUrl) missing.push("Upload Pre-Install Photo");
      if (!lead.s3_discomRemark) missing.push("Remark");
    } else if (stepId === 7) {
      if (!lead.s6_expectedStartDate) missing.push("Expected Work Start Date");
      if (!lead.s6_siteRevisitDate) missing.push("Site Revisit Date");
      if (!lead.s6_materialListUrl) missing.push("Material List");
      if (!lead.s6_siteDrawingUrl) missing.push("Site Drawing");
      if (!lead.s6_siteTeamRemark) missing.push("Remark");
    } else if (stepId === 8) {
      if (!lead.s5_materialReadyToDispatch)
        missing.push("Material Ready to Dispatch");
      if (!lead.s5_materialReadyToDispatchDate)
        missing.push("Material Ready to Dispatch Date");
      if (!lead.s5_storeDispatchDate) missing.push("Dispatch Date");
      if (!lead.s5_materialListUrl) missing.push("Store Material List");
      if (!lead.s5_storeRemark) missing.push("Remark");
    } else if (stepId === 9) {
      if (!lead.s6_materialReceivedDate) missing.push("Material Received Date");
      if (!lead.s6_receivedMaterialListUrl)
        missing.push("Received Material List");
      if (!lead.s6_workStartDate) missing.push("Work Start Date");
      if (!lead.s6_workCompletionReportUrl)
        missing.push("Completion Report File");
      if (!lead.s6_photoGpsUrl) missing.push("Project GPS Photos");
      if (!lead.s6_photoInverterUrl) missing.push("Inverter Photo");
      if (!lead.s6_photoStructureUrl) missing.push("Structure Photo");
      if (!lead.s6_photoFoundationUrl) missing.push("Foundation Photo");
      if (!lead.s6_photoEarthingUrl) missing.push("Earthing Photo");
      if (!lead.s6_photoWiringUrl) missing.push("Wiring Photo");
      if (!lead.s6_photoInverterSrNoUrl) missing.push("Inverter Sr No Photo");
      if (!lead.s6_photoPanelSrNoUrl) missing.push("Panel Sr No Photo");
      if (!lead.s6_workEndDate) missing.push("Work End Date");
      if (!lead.s6_expectedEndDate) missing.push("Expected End Date");
      if (!lead.s6_remarks) missing.push("Remark");
    } else if (stepId === 10) {
      if (!lead.s7_onlineSubmissionDate) missing.push("Online Submission Date");
      if (!lead.s7_installationStatus) missing.push("Installation Status");
      if (!lead.s7_dcrCertificateUrl) missing.push("DCR Certificate");
      if (!lead.s7_workCompletionCertificateUrl)
        missing.push("Work Completion Certificate");
      if (!lead.s7_invoiceAdvanceReceiptUrl)
        missing.push("Invoice+Advance Receipt");
      if (!lead.s7_officeRemark) missing.push("Remark");
    } else if (stepId === 11) {
      if (!lead.s8_discomInspectionDate) missing.push("Discom Inspection Date");
      if (!lead.s8_meterInstalledDate) missing.push("Meter Installed Date");
      if (!lead.s8_trainingCertUrl) missing.push("Training Certificate");
      if (!lead.s8_smartMeterConverted)
        missing.push("Smart Meter Converted to Net Meter");
      if (lead.s8_smartMeterConverted === "Yes" && !lead.s8_convertedPhotoUrl)
        missing.push("Converted Photo");
      if (!lead.s8_siteOnDate) missing.push("Site ON Date");
      if (!lead.s8_discomRemark) missing.push("Remark");
    } else if (stepId === 12) {
      if (lead.loanRequired !== "Yes") return [];
      if (!lead.s9_secondInstallmentReceived)
        missing.push("2nd Installment Received Status");
      if (lead.s9_secondInstallmentReceived === "Yes") {
        if (!lead.s9_secondInstallmentAmount) missing.push("Amount");
        if (!lead.s9_secondInstallmentUtr) missing.push("UTR No");
        if (!lead.s9_secondInstallmentDate) missing.push("Date");
      }
      if (!lead.s9_loanRemark) missing.push("Remark");
    } else if (stepId === 13) {
      if (!lead.s11_subsidyAppliedDate) missing.push("Subsidy Applied Date");
      if (!lead.s11_subsidyAmount) missing.push("Subsidy Amount");
      if (!lead.s11_remarks) missing.push("Remark");
    } else if (stepId === 14) {
      if (lead.newConnectionRequired !== "Yes") return [];
      if (!lead.s_newConn_appliedDate)
        missing.push("New Connection Applied Date");
      if (!lead.s_newConn_uploadPhotosUrl)
        missing.push("Upload Photos (New Connection)");
      if (!lead.executionNewConnectionPhotosUrl)
        missing.push("New Connection Photos (Project Details)");
    } else if (stepId === 15) {
      if (!lead.s12_insuranceStatus) missing.push("Insurance Status");
      if (lead.s12_insuranceStatus === "Done") {
        if (!lead.s12_policyDetails) missing.push("Policy Details");
        if (!lead.s12_policyDate) missing.push("Policy Date");
      }
    }
    return missing;
  };

  const handleStepAction = async () => {
    if (!lead || !remarkModal.stepId) return;

    const { stepId, type, nameField, emailField } = remarkModal;

    if (type === "assign" && !canUserAssignTasks) {
      showNotification(
        "Task assignment is strictly limited to Admin and the formally assigned Project Coordinator.",
        "error",
      );
      return;
    }

    const updates: any = {};

    if (type === "complete") {
      updates[`isStep${stepId}Submitted`] = true;
      updates[`step${stepId}Status`] = "Completed";
      updates[`step${stepId}Remark`] = stepRemarkInput;

      const completionDates = { ...(lead.stepCompletionDates || {}) };
      completionDates[stepId] = new Date().toISOString();
      updates.stepCompletionDates = completionDates;
    } else if (type === "assign-back") {
      updates[`step${stepId}Status`] = selectedStatus;
      updates[`step${stepId}Remark`] = stepRemarkInput;
      // Assign back to Project Incharge
      if (nameField && emailField) {
        updates[nameField] = lead.projectInchargeName || "";
        updates[emailField] = lead.projectInchargeEmail || "";
      }
      if (selectedStatus === "Completed") {
        updates[`isStep${stepId}Submitted`] = true;
        const completionDates = { ...(lead.stepCompletionDates || {}) };
        completionDates[stepId] = new Date().toISOString();
        updates.stepCompletionDates = completionDates;
      }
    } else if (type === "assign") {
      const selectedUser = users.find((u) => u.name === selectedAssignee);
      if (selectedUser && nameField && emailField) {
        updates[nameField] = selectedUser.name;
        updates[emailField] = selectedUser.email;
        updates[`step${stepId}Status`] = "Pending";
        updates[`step${stepId}Remark`] = stepRemarkInput;
        updates[`isStep${stepId}Submitted`] = false;

        const assignmentDates = { ...(lead.stepAssignmentDates || {}) };
        assignmentDates[stepId] = new Date().toISOString();
        updates.stepAssignmentDates = assignmentDates;
      }
    }

    updates.updatedAt = new Date() as any;

    // Auto-log payments for installment steps when completed/validated
    if (
      updates[`isStep${stepId}Submitted`] ||
      (type === "assign-back" && selectedStatus === "Completed")
    ) {
      try {
        if (
          stepId === 4 &&
          lead.s4_firstInstallmentReceived === "Yes" &&
          lead.s4_firstInstallmentAmount
        ) {
          const qStr = query(
            collection(db, "payments"),
            where("leadId", "==", lead.id),
            where("paymentType", "==", "Installment 1"),
          );
          const snap = await getDocs(qStr);
          if (snap.empty) {
            await paymentService.addPayment({
              leadId: lead.id,
              leadName: lead.customerName || "Unknown",
              amount: Number(lead.s4_firstInstallmentAmount || 0),
              utrNo: lead.s4_firstInstallmentUtr || "",
              date: lead.s4_firstInstallmentDate || "",
              paymentType: "Installment 1",
              status: "Pending",
              method: "Online",
              remarks:
                "Auto-logged via Step 4 (Installment 1) validation - Pending Approval",
              confirmationAssignee: lead.accAssignee || "",
            });
          }
        } else if (
          (stepId === 9 || stepId === 12) &&
          lead.s9_secondInstallmentReceived === "Yes" &&
          lead.s9_secondInstallmentAmount
        ) {
          const qStr = query(
            collection(db, "payments"),
            where("leadId", "==", lead.id),
            where("paymentType", "==", "Installment 2"),
          );
          const snap = await getDocs(qStr);
          if (snap.empty) {
            await paymentService.addPayment({
              leadId: lead.id,
              leadName: lead.customerName || "Unknown",
              amount: Number(lead.s9_secondInstallmentAmount || 0),
              utrNo: lead.s9_secondInstallmentUtr || "",
              date: lead.s9_secondInstallmentDate || "",
              paymentType: "Installment 2",
              status: "Pending",
              method: "Online",
              remarks: `Auto-logged via Step ${stepId} (${stepId === 9 ? "Installment 2 Validation" : "LOAN OFFICER Post-Install"}) - Pending Approval`,
              confirmationAssignee: lead.accAssignee || "",
            });
          }
        } else if (
          stepId === 10 &&
          lead.s10_balanceApplicable === "Yes" &&
          lead.s10_balanceAmount
        ) {
          const qStr = query(
            collection(db, "payments"),
            where("leadId", "==", lead.id),
            where("paymentType", "==", "Balance"),
          );
          const snap = await getDocs(qStr);
          if (snap.empty) {
            await addDoc(collection(db, "payments"), {
              leadId: lead.id,
              leadName: lead.customerName || "Unknown",
              amount: Number(lead.s10_balanceAmount || 0),
              utrNo: lead.s10_balanceUtr || "",
              date: lead.s10_balanceDate || "",
              paymentType: "Balance",
              status: "Confirmed",
              method: "Online",
              remarks: "Auto-logged via Step 10 (Balance) validation",
              recordedBy: auth.currentUser?.email || "System",
              recordedAt: new Date(),
            });
          }
        }
      } catch (err) {
        console.error("Auto-payment logging failed:", err);
      }
    }

    setIsSaving(true);
    try {
      await leadService.updateLead(lead.id, updates);
      setLead((prev) => (prev ? { ...prev, ...updates } : null));
      let msg = "Task updated successfully";
      if (type === "complete") msg = "Phase Validated Successfully";
      if (type === "assign-back") msg = "Handed over to Project Incharge";
      if (type === "assign") msg = "Task assigned successfully";
      showNotification(msg, "success");
      setRemarkModal((prev) => ({ ...prev, isOpen: false, stepId: 0 }));
      setStepRemarkInput("");
      setSelectedAssignee("");
      setSelectedStatus("Assigned-Back");
    } catch (err) {
      showNotification("Failed to update task", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignment = async (
    stepId: number,
    nameField: string,
    emailField: string,
    selectedUserName: string,
  ) => {
    if (!lead) return;
    if (!canUserAssignTasks) {
      showNotification(
        "Task assignment is strictly limited to Admin and the formally assigned Project Coordinator.",
        "error",
      );
      return;
    }
    const selectedUser = users.find((u) => u.name === selectedUserName);
    if (!selectedUser) return;

    const assignmentDates = { ...(lead.stepAssignmentDates || {}) };
    assignmentDates[stepId] = new Date().toISOString();

    const updates = {
      [nameField]: selectedUser.name,
      [emailField]: selectedUser.email,
      [`step${stepId}Status`]: "Pending", // Reset status when re-assigned
      [`isStep${stepId}Submitted`]: false,
      stepAssignmentDates: assignmentDates,
      updatedAt: new Date() as any,
    };

    setIsSaving(true);
    try {
      await leadService.updateLead(lead.id, updates);
      setLead((prev) => (prev ? { ...prev, ...updates } : null));
      showNotification(
        `Task has been assigned to ${selectedUser.name}`,
        "success",
      );
    } catch (err) {
      showNotification("Assignment failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskSheetAssignment = async () => {
    if (!lead || !activeAssignStep) return;
    if (!canUserAssignTasks) {
      showNotification(
        "Task assignment is strictly limited to Admin and the formally assigned Project Coordinator.",
        "error",
      );
      return;
    }
    const { id: stepId, nameField, emailField } = activeAssignStep;

    // Find selected user
    const selectedUser = users.find((u) => u.name === assignSelectedUser);

    const assignmentDates = { ...(lead.stepAssignmentDates || {}) };
    if (selectedUser) {
      assignmentDates[stepId] = new Date().toISOString();
    }

    const updates: any = {
      [nameField]: selectedUser ? selectedUser.name : "",
      [emailField]: selectedUser ? selectedUser.email : "",
      [`step${stepId}Status`]: selectedUser ? "Pending" : "Unassigned",
      [`isStep${stepId}Submitted`]: false,
      [`step${stepId}Remark`]: assignRemarkText,
      stepAssignmentDates: assignmentDates,
      updatedAt: new Date() as any,
    };

    const todayStr = new Date().toLocaleDateString("en-CA");
    const dueDates = { ...(lead.stepDueDates || {}) };
    dueDates[stepId] = todayStr;
    updates.stepDueDates = dueDates;

    setIsSaving(true);
    try {
      await leadService.updateLead(lead.id, updates);
      setLead((prev) => (prev ? { ...prev, ...updates } : null));
      showNotification(
        `Assignment updated successfully for ${activeAssignStep.label}`,
        "success",
      );
      setActiveAssignStep(null);
    } catch (err) {
      showNotification("Assignment update failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const StepActionButtons = ({
    stepId,
    label,
    nameField,
    emailField,
    hideAssignment = false,
  }: {
    stepId: number;
    label: string;
    nameField: string;
    emailField: string;
    hideAssignment?: boolean;
  }) => {
    if (!lead) return null;
    const isCompleted = (lead as any)[`isStep${stepId}Submitted`];
    const status = (lead as any)[`step${stepId}Status`];
    const remark = (lead as any)[`step${stepId}Remark`];

    const userEmail = user?.email?.toLowerCase()?.trim();

    // Project Incharge and Admin can assign all steps as per canUserAssignTasks constraints
    const canAssignResult = canUserAssignTasks;

    return (
      <div className="col-span-full mt-2 md:mt-4 pt-4 border-t border-slate-100">
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-6 flex flex-col gap-3 md:gap-4">
          {/* Assignment Status Header */}
          {!hideAssignment && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 border-b border-slate-200 pb-3 md:pb-4 mb-0.5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 shrink-0">
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    Assignee
                  </p>
                  <p className="text-xs md:text-sm font-bold text-slate-900 truncate">
                    {(lead as any)[nameField] || "Unassigned"}
                    {(lead as any)[emailField]?.toLowerCase().trim() ===
                      lead.projectInchargeEmail?.toLowerCase().trim() && (
                      <span className="ml-2 text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        Steward
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <span
                  className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border transition-all duration-500 whitespace-nowrap ${
                    isCompleted
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-sm md:shadow-md"
                      : status === "Assigned-Back"
                        ? "bg-rose-500 text-white border-rose-500 shadow-sm md:shadow-md"
                        : "bg-blue-50 text-blue-600 border-blue-100"
                  }`}
                >
                  {isCompleted ? "Validated" : status || "Pending"}
                </span>
              </div>
            </div>
          )}
          {/* Note Section */}
          {remark && (
            <div className="bg-white/80 border border-slate-100 rounded-lg md:rounded-xl p-3 md:p-4 flex gap-2 md:gap-3 items-start shadow-sm">
              <div className="w-6 h-6 md:w-7 md:h-7 bg-blue-50 rounded md:rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600">
                <MessageSquare className="w-3 md:w-3.5 h-3 md:h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">
                  Instruction
                </p>
                <p className="text-[10px] md:text-xs text-slate-700 font-semibold italic leading-relaxed break-words">
                  "{remark}"
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {canAssignResult && !hideAssignment && (
                <>
                  <button
                    onClick={() => {
                      setRemarkModal({
                        isOpen: true,
                        stepId,
                        type: "assign",
                        title: `Assign: ${label}`,
                        description: `Assign this phase and provide instructions.`,
                        btnText: "Assign",
                        btnColor: "bg-blue-600",
                        nameField,
                        emailField,
                      });
                      setSelectedAssignee((lead as any)[nameField] || "");
                    }}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg font-bold uppercase tracking-widest text-[8px] md:text-[9px] hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-1 md:gap-1.5 shadow-md"
                  >
                    <UserPlus className="w-3 md:w-3.5 h-3 md:h-3.5" />{" "}
                    {(lead as any)[nameField] ? "Reassign" : "Assign"}
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isCompleted && canEditStep(stepId) && (
                <button
                  onClick={() => {
                    if (activeTab === "execution") {
                      const missing = getMissingExecutionFields(stepId, lead);
                      if (missing.length > 0) {
                        showNotification(
                          "Missing mandatory fields: " + missing.join(", "),
                          "error",
                        );
                        return;
                      }
                    }
                    setRemarkModal({
                      isOpen: true,
                      stepId,
                      type: "complete",
                      title: `Submit Phase`,
                      description: `Complete "${label}".`,
                      btnText: "Submit",
                      btnColor: "bg-emerald-600",
                    });
                  }}
                  className="px-4 py-1.5 md:px-6 md:py-2 bg-emerald-600 text-white rounded-lg font-bold uppercase tracking-widest text-[8px] md:text-[9px] hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1 md:gap-1.5 shadow-md ml-auto"
                >
                  <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> Submit
                </button>
              )}

              {isCompleted && (
                <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 font-bold text-[10px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs: { id: Tab; label: string; icon: any }[] = useMemo(() => {
    const allTabs: { id: Tab; label: string; icon: any }[] = [
      { id: "basic", label: "Basic Info", icon: Info },
      { id: "pre_sales", label: "Pre-Sales", icon: MessageSquare },
      { id: "survey", label: "Site Survey", icon: HardDrive },
      { id: "sales", label: "Sales & Status", icon: Clock },
      { id: "financials", label: "Project Details", icon: CreditCard },
      { id: "accounts", label: "Accounts", icon: UserIcon },
      { id: "project_incharge", label: "Project Control", icon: Shield },
      { id: "execution", label: "Project Execution", icon: Zap },
      { id: "handover", label: "Review & Settlement", icon: Users },
      { id: "deliverables", label: "Deliverables", icon: FileCheck },
      { id: "final_review", label: "Final Review", icon: CheckCircle2 },
      { id: "documents", label: "Document Hub", icon: FolderOpen },
    ];

    if (!lead) return allTabs.filter((t) => t.id === "basic");

    const userEmail = user?.email?.toLowerCase()?.trim();
    const isProjectCoordinator = users.find(
      (u) =>
        u.email?.toLowerCase()?.trim() === userEmail,
    )?.category === "Project Coordinator";

    return allTabs.filter((tab) => {
      if (tab.id === "handover") {
        return isAdminUser;
      }
      if (tab.id === "final_review") {
        return isAdminUser;
      }
      if (tab.id === "deliverables") {
        return isAdminUser || isProjectCoordinator || (lead.deliverablesAssignedEmail && lead.deliverablesAssignedEmail.toLowerCase().trim() === userEmail);
      }
      if (tab.id === "basic" || tab.id === "documents") return true;

      if (isAdminUser || isProjectCoordinator) return true;

      const isCreator = lead.createdBy?.toLowerCase()?.trim() === userEmail;

      const isAnyAssignee = [
        lead.assignedTo,
        lead.assignedPreSales,
        lead.assignedToEmail,
        lead.assignedSalesEmail,
        lead.projectAssigneeEmail,
        lead.accAssigneeEmail,
        lead.projectInchargeEmail,
        lead.s_docCorr_assignedToEmail,
        lead.s_loadExt_assignedToEmail,
        lead.execution_assignedToEmail,
        lead.s4_loanAssignedToEmail,
        lead.s5_storeDispatchAssignedToEmail,
        lead.s5_discomPreAssignedToEmail,
        lead.s6_inchargeAssignedToEmail,
        lead.s5_storeInchargeAssignedToEmail,
        lead.s6_assignedToEmail,
        lead.s7_assignedToEmail,
        lead.s8_assignedToEmail,
        lead.s9_assignedToEmail,
        lead.s10_assignedToEmail,
        lead.s11_assignedToEmail,
        lead.s12_assignedToEmail,
        lead.s_newConn_assignedToEmail,
      ]
        .map((e) => (e || "").toLowerCase().trim())
        .includes(userEmail || "");

      const isAssignedToLead = isCreator || isAnyAssignee;
      const hasReachedProjectDetails = lead.status === "Won";

      // Lead Creator and Main Assignees can see ALL tabs
      if (isAssignedToLead) return true;

      if (tab.id === "survey") return !hasReachedProjectDetails;
      if (tab.id === "sales") return !hasReachedProjectDetails;

      // The tabs below are "further steps" and should only be visible if status is 'Won'
      if (!hasReachedProjectDetails) return false;

      if (tab.id === "financials") {
        const currentUserObj = users.find(
          (u) => u.email?.toLowerCase()?.trim() === userEmail,
        );
        const currentUserName = currentUserObj?.name?.toLowerCase()?.trim();
        return (
          (lead.projectAssigneeEmail || "").toLowerCase().trim() ===
            userEmail ||
          (currentUserName &&
            (lead.projectAssignee || "").toLowerCase().trim() ===
              currentUserName)
        );
      }

      if (tab.id === "accounts") {
        const currentUserObj = users.find(
          (u) => u.email?.toLowerCase()?.trim() === userEmail,
        );
        const currentUserName = currentUserObj?.name?.toLowerCase()?.trim();
        const currentDisplayName = user?.displayName?.toLowerCase()?.trim();
        return (
          (lead.accAssigneeEmail || "").toLowerCase().trim() === userEmail ||
          (currentDisplayName &&
            (lead.accAssignee || "").toLowerCase().trim() ===
              currentDisplayName) ||
          (currentUserName &&
            (lead.accAssignee || "").toLowerCase().trim() === currentUserName)
        );
      }

      if (tab.id === "project_incharge" || tab.id === "execution") {
        const relevantEmails = [
          lead.projectInchargeEmail,
          lead.s_docCorr_assignedToEmail,
          lead.s_loadExt_assignedToEmail,
          lead.execution_assignedToEmail,
          lead.s4_loanAssignedToEmail,
          lead.s5_storeDispatchAssignedToEmail,
          lead.s5_discomPreAssignedToEmail,
          lead.s6_inchargeAssignedToEmail,
          lead.s5_storeInchargeAssignedToEmail,
          lead.s6_assignedToEmail,
          lead.s7_assignedToEmail,
          lead.s8_assignedToEmail,
          lead.s9_assignedToEmail,
          lead.s10_assignedToEmail,
          lead.s11_assignedToEmail,
          lead.s12_assignedToEmail,
          lead.s_newConn_assignedToEmail,
        ]
          .map((e) => (e || "").toLowerCase().trim())
          .filter(Boolean);
        return relevantEmails.includes(userEmail || "");
      }

      return false;
    });
  }, [lead, role, user, users, isAdminUser]);

  const totalReceived = useMemo(() => {
    if (!lead) return 0;
    if (typeof lead.payment_receivedAmount === "number") {
      return lead.payment_receivedAmount;
    }
    return (
      (Number(lead.advanceAmount) || 0) +
      (Number(lead.s4_firstInstallmentAmount) || 0) +
      (Number(lead.s9_secondInstallmentAmount) || 0) +
      (lead.s10_balanceApplicable === "Yes"
        ? Number(lead.s10_balanceAmount) || 0
        : 0)
    );
  }, [lead]);

  const dueAmount = useMemo(() => {
    if (!lead) return 0;
    return Math.max(0, (Number(lead.finalRate) || 0) - totalReceived);
  }, [lead, totalReceived]);

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] =
    useState(false);
  const [matrixMonth, setMatrixMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [matrixSelectedUser, setMatrixSelectedUser] = useState<string>("All");
  const reportRef = useRef<HTMLDivElement>(null);

  const matrixDays = useMemo(() => {
    const year = matrixMonth.getFullYear();
    const month = matrixMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Padding days from previous month
    const firstDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ dateObj: d, isCurrentMonth: false, isToday: false });
    }

    // Days in current month
    const todayStr = new Date().toDateString();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        dateObj: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === todayStr,
      });
    }

    // Padding days for next month
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ dateObj: d, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [matrixMonth]);

  const allOperatingUsers = useMemo(() => {
    const roles = [
      "Site Team",
      "Site Incharge",
      "Store Manager",
      "Project Coordinator",
      "Executive",
      "Sales Partner",
      "Sales Person",
    ];
    return users.filter(
      (u) => roles.includes(u.category || "") || u.category === "All",
    );
  }, [users]);

  const calendarData = useMemo(() => {
    return matrixDays.map((day) => {
      // Aggregate pseudo tasks for demo.
      // In a real app, trace actual tasks assigned to `matrixSelectedUser` on this date.
      let taskCount = 0;
      let busyUsers = 0;

      if (matrixSelectedUser === "All") {
        allOperatingUsers.forEach((u) => {
          // pseudo-random stable schedule for demo
          if (
            (u.email.length + day.dateObj.getDate() + day.dateObj.getMonth()) %
              4 ===
            0
          ) {
            taskCount += 1;
            busyUsers += 1;
          }
        });
      } else {
        const u = allOperatingUsers.find((u) => u.email === matrixSelectedUser);
        if (
          u &&
          (u.email.length + day.dateObj.getDate() + day.dateObj.getMonth()) %
            3 ===
            0
        ) {
          taskCount = (day.dateObj.getDate() % 3) + 1; // 1 to 3 tasks
        }
      }

      return {
        ...day,
        taskCount,
        busyUsers,
      };
    });
  }, [matrixDays, matrixSelectedUser, allOperatingUsers]);

  const nextMonth = () => {
    setMatrixMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };
  const prevMonth = () => {
    setMatrixMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  useEffect(() => {
    let unsubscribeFile = () => {};

    async function loadData() {
      console.log(
        `[LeadDetail] Loading users and initial data for leadId: ${leadId}`,
      );
      try {
        const [userData, rolesData] = await Promise.all([
          userService.getAllUsers(),
          commissionService.getCommissionRoles()
        ]);
        setUsers(userData);
        setCommissionRoles(rolesData);

        unsubscribeFile = leadService.subscribeToLead(leadId, (leadData) => {
          console.log(
            `[LeadDetail] Realtime update received. Lead found:`,
            !!leadData,
          );
          if (leadData) {
            setLead(leadData as unknown as Lead);
          } else {
            setError("Lead not found in the database.");
          }
          setLoading(false);
        });
      } catch (err: any) {
        console.error("Error loading lead data", err);
        setError(err.message || "Failed to load lead details.");
        setLoading(false);
      }
    }
    loadData();

    return () => unsubscribeFile();
  }, [leadId]);

  const handleUpdate = React.useCallback(
    async (updates: Partial<Lead>, silent: boolean = true) => {
      if (!lead) return;

      // Auto-calculate rates if survey fields change
      let finalUpdates = { ...updates };

      // Sync Plan Site Visit Date to Site Visit Date
      if (updates.planSiteVisitDate) {
        finalUpdates.siteVisitDate = updates.planSiteVisitDate;
      }

      const relevantFields = [
        "locationType",
        "finalKw",
        "dcrType",
        "stdPackage",
        "discount",
        "deviationCost",
        "s6_deviationCost",
        "rateDeviationNotes",
        "s6_deviationFromFinal",
      ];
      const hasRateField = Object.keys(updates).some((k) =>
        relevantFields.includes(k),
      );

      if (hasRateField) {
        const city = updates.locationType || lead.locationType;
        const kw = updates.finalKw || lead.finalKw;
        const dcr = updates.dcrType || lead.dcrType;
        const pkg = updates.stdPackage || lead.stdPackage;

        let devCost =
          updates.deviationCost !== undefined
            ? Number(updates.deviationCost)
            : Number(lead.deviationCost || 0);
        let s6DevCost =
          updates.s6_deviationCost !== undefined
            ? Number(updates.s6_deviationCost)
            : Number(lead.s6_deviationCost || 0);

        if (updates.rateDeviationNotes === "No") {
          devCost = 0;
          finalUpdates.deviationCost = 0;
          finalUpdates.deviationDetails = "";
        }

        if (updates.s6_deviationFromFinal === "No") {
          s6DevCost = 0;
          finalUpdates.s6_deviationCost = 0;
          finalUpdates.s6_deviationDetails = "";
        }

        const discount =
          updates.discount !== undefined
            ? Number(updates.discount)
            : Number(lead.discount || 0);

        if (city && kw && dcr && pkg) {
          const key = `${city}${dcr}${pkg.toUpperCase()}`;
          const rate = RATE_TABLE[key]?.[kw as string];
          if (rate) {
            finalUpdates.originalRate = rate;
            finalUpdates.rateAfterDeviation = rate + devCost;
            finalUpdates.finalRate = rate + devCost + s6DevCost - discount;
          } else {
            const baseRate =
              typeof lead.originalRate === "number" ? lead.originalRate : 0;
            finalUpdates.rateAfterDeviation = baseRate + devCost;
            finalUpdates.finalRate = baseRate + devCost + s6DevCost - discount;
          }
        } else {
          const baseRate =
            typeof lead.originalRate === "number" ? lead.originalRate : 0;
          finalUpdates.rateAfterDeviation = baseRate + devCost;
          finalUpdates.finalRate = baseRate + devCost + s6DevCost - discount;
        }
      }

      // Update members array if any assignment field changed
      const emailFieldsArray = [
        "createdBy",
        ...ASSIGNEE_FIELDS.map((f) => f.email),
      ];
      const assignmentFieldMap: Record<string, string> = {
        assignedTo: "survey",
        assignedSalesEmail: "sales",
        projectAssigneeEmail: "financials",
        accAssigneeEmail: "accounts",
        projectInchargeEmail: "execution_start",
        s_docCorr_assignedToEmail: "1",
        s_loadExt_assignedToEmail: "2",
        execution_assignedToEmail: "3",
        s4_loanAssignedToEmail: "4",
        s5_storeDispatchAssignedToEmail: "5",
        s5_discomPreAssignedToEmail: "6",
        s6_inchargeAssignedToEmail: "7",
        s5_storeInchargeAssignedToEmail: "8",
        s6_assignedToEmail: "9",
        s7_assignedToEmail: "10",
        s8_assignedToEmail: "11",
        s9_assignedToEmail: "12",
        s11_assignedToEmail: "13",
        s_newConn_assignedToEmail: "14",
      };

      const completionFieldMap: Record<string, string> = {
        isBasicSubmitted: "basic",
        isSurveySubmitted: "survey",
        isSalesSubmitted: "sales",
        isFinancialsSubmitted: "financials",
        isAccountsSubmitted: "accounts",
        isExecutionSubmitted: "execution_start",
      };

      const hasAssigneeChange = Object.keys(finalUpdates).some((k) =>
        ASSIGNEE_FIELDS.some((f) => f.name === k || f.email === k),
      );
      const nowISO = new Date().toISOString();

      // Track assignment dates
      const assignmentDates = { ...(lead.stepAssignmentDates || {}) };
      let changed = false;
      Object.keys(finalUpdates).forEach((key) => {
        const stepId = assignmentFieldMap[key];
        if (stepId && finalUpdates[key as keyof Lead]) {
          assignmentDates[stepId] = nowISO;
          changed = true;
        }
      });
      if (changed) finalUpdates.stepAssignmentDates = assignmentDates;

      // Track completion dates
      const completionDates = { ...(lead.stepCompletionDates || {}) };
      let compChanged = false;
      Object.keys(finalUpdates).forEach((key) => {
        const stepId = completionFieldMap[key];
        if (stepId && finalUpdates[key as keyof Lead] === true) {
          completionDates[stepId] = nowISO;
          compChanged = true;
        }
      });
      if (compChanged) finalUpdates.stepCompletionDates = completionDates;

      if (hasAssigneeChange) {
        const currentLead = { ...lead, ...finalUpdates };
        const newMembers = Array.from(
          new Set(
            emailFieldsArray
              .map((f) => (currentLead as any)[f])
              .filter(Boolean),
          ),
        ) as string[];
        finalUpdates.members = newMembers;
      }

      setIsSaving(true);
      // Optimistic update for local state to handle auto-calculations smoothly
      setLead((prev) => (prev ? { ...prev, ...finalUpdates } : null));

      try {
        await leadService.updateLead(leadId, finalUpdates);

        // Show notification only if not silent
        if (!silent) {
          showNotification("Update successful", "success");
        }
      } catch (error: any) {
        console.error("Update failed", error);
        showNotification(
          "Failed to save data: " + (error.message || "Unknown error"),
          "error",
        );
        // Rollback local state
        const data = await leadService.getLead(leadId);
        if (data) setLead(data as unknown as Lead);
      } finally {
        setIsSaving(false);
      }
    },
    [lead, leadId],
  );

  const handleStepUpdate = async (stepId: number) => {
    if (!lead) return;

    // MANDATORY DOCUMENT & FIELD VALIDATION
    if (stepId === 1) {
      if (lead.s_docCorr_required === "Yes") {
        if (!lead.s_docCorr_docUrl) {
          showNotification("Please upload Corrected Document", "warning");
          return;
        }
        if (!lead.s_loadExt_assignedTo) {
          showNotification(
            "Please assign someone for Step 3: Load Extension Required",
            "warning",
          );
          return;
        }
      }
    }

    if (stepId === 2) {
      if (lead.loadExtensionRequired === "Yes") {
        const missing = [];
        if (!lead.s3_loadExtFileUrl) missing.push("Load Extension File");
        if (!lead.s3_demandNoteIssued) missing.push("Demand Note Issued");
        if (!lead.s3_demandDeposited) missing.push("Demand Deposited");
        if (missing.length > 0) {
          showNotification(
            "Please fill mandatory fields: " + missing.join(", "),
            "warning",
          );
          return;
        }
      }
      if (!lead.execution_assignedTo) {
        showNotification(
          "Please Assign for Step 4: Online Registration",
          "warning",
        );
        return;
      }
    }

    if (stepId === 3) {
      const missing = [];
      if (!lead.s3_aenOfficeName) missing.push("AEN Office Name");
      if (!lead.s3_onlineRegistrationDone)
        missing.push("Online Registration Done (Date)");
      if (!lead.s3_discomFileUrl) missing.push("Discom File");

      const isLoan = lead.loanRequired === "Yes";
      if (isLoan && !lead.s3_loanFileUrl) {
        missing.push("Loan File");
      }

      const nextAssignee = isLoan
        ? lead.s4_loanAssignedTo
        : lead.s5_storeDispatchAssignedTo;
      const nextLabel = isLoan
        ? "Assign for Step 5: Loan Process"
        : "Assign for Step 6: Meter Dispatch";

      if (!nextAssignee) {
        missing.push(nextLabel);
      }

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields/documents: " + missing.join(", "),
          "warning",
        );
        return;
      }
    }

    if (stepId === 4) {
      const missing = [];
      if (!lead.s4_physicalFileToBankDate)
        missing.push("Physical File to Bank (Date)");
      if (!lead.s4_loanProcessDate) missing.push("Loan Process (Date)");
      if (!lead.s4_customerSignDate) missing.push("Customer Sign Done (Date)");
      if (!lead.s5_storeDispatchAssignedTo)
        missing.push("Assign for Step 6: Meter Dispatch");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (
        lead.s4_firstInstallmentReceived === "Yes" &&
        (!lead.s4_firstInstallmentAmount ||
          !lead.s4_firstInstallmentUtr ||
          !lead.s4_firstInstallmentDate)
      ) {
        showNotification(
          "Please fill all first installment details",
          "warning",
        );
        return;
      }
    }

    if (stepId === 5) {
      const missing = [];
      if (!lead.s5_meters) missing.push("Meters Status");
      if (!lead.s5_dispatchDate) missing.push("Meter Dispatch Date");
      if (!lead.s5_meterDetails)
        missing.push("Meter Details with serial numbers");
      if (!lead.s5_discomPreAssignedTo)
        missing.push("Assign for Step 7: DISCOM (Pre-Install)");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
    }

    if (stepId === 6) {
      const missing = [];
      if (!lead.s5_fileMeterToDiscomDate) missing.push("Submission Date");
      if (!lead.s6_inchargeAssignedTo)
        missing.push("Assign for Step 8: Site Incharge");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (!lead.s5_preInstallPhotoUrl) {
        showNotification("Please upload Pre-Install Photo", "warning");
        return;
      }
    }

    if (stepId === 7) {
      const missing = [];
      if (!lead.s6_expectedStartDate) missing.push("Expected Start Date");
      if (!lead.s6_siteRevisitDate) missing.push("Revisit Date");
      if (!lead.s5_storeInchargeAssignedTo)
        missing.push("Assign for Step 9: Store Incharge");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (!lead.s6_materialListUrl || !lead.s6_siteDrawingUrl) {
        showNotification(
          "Please upload mandatory documents: Material List and Site Drawing",
          "warning",
        );
        return;
      }
    }

    if (stepId === 8) {
      const missing = [];
      if (!lead.s5_materialReadyToDispatch) missing.push("Dispatch Status");
      if (!lead.s5_storeDispatchDate) missing.push("Dispatch Date");
      if (!lead.s6_assignedTo) missing.push("Assign for Step 10: Site Team");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (!lead.s5_materialListUrl) {
        showNotification("Please upload Store Material List", "warning");
        return;
      }
    }

    if (stepId === 9) {
      const missing = [];
      if (!lead.s6_materialReceivedDate) missing.push("Material Received Date");
      if (!lead.s6_workStartDate) missing.push("Work Start Date");
      if (!lead.s6_workEndDate) missing.push("Work End Date");
      if (!lead.s7_assignedTo)
        missing.push("Assign for Step 11: Office Executive");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (
        !lead.s6_receivedMaterialListUrl ||
        !lead.s6_photoGpsUrl ||
        !lead.s6_photoInverterUrl ||
        !lead.s6_photoStructureUrl ||
        !lead.s6_photoFoundationUrl ||
        !lead.s6_photoEarthingUrl ||
        !lead.s6_photoWiringUrl ||
        !lead.s6_photoInverterSrNoUrl ||
        !lead.s6_photoPanelSrNoUrl
      ) {
        showNotification(
          "Please upload Material List and All 8 required Project Photos (including Sr No photos)",
          "warning",
        );
        return;
      }
      if (!lead.s6_workCompletionReportUrl) {
        showNotification("Please upload Work Completion Report", "warning");
        return;
      }
    }

    if (stepId === 10) {
      const missing = [];
      if (!lead.s7_onlineSubmissionDate) missing.push("Online Submission Date");
      if (!lead.s8_assignedTo)
        missing.push("Assign for Step 12: DISCOM (Post-Install)");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (
        !lead.s7_dcrCertificateUrl ||
        !lead.s7_workCompletionCertificateUrl ||
        !lead.s7_invoiceAdvanceReceiptUrl
      ) {
        showNotification(
          "Please upload all documents (DCR Certificate, Work Completion Certificate, Invoice+Advance Receipt)",
          "warning",
        );
        return;
      }
    }

    if (stepId === 11) {
      const missing = [];
      if (!lead.s8_discomInspectionDate) missing.push("Inspection Date");
      if (!lead.s8_meterInstalledDate) missing.push("Meter Installation Date");
      if (!lead.s8_smartMeterConverted)
        missing.push("Smart Meter Converted to Net Meter");
      if (lead.s8_smartMeterConverted === "Yes" && !lead.s8_convertedPhotoUrl)
        missing.push("Converted Photo");
      if (lead.loanRequired === "Yes" && !lead.s9_assignedTo)
        missing.push("Assign for Step 12: Loan Final");
      if (lead.loanRequired !== "Yes" && !lead.s11_assignedTo)
        missing.push("Assign for Step 13: Subsidy Claim");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (!lead.s8_trainingCertUrl) {
        showNotification(
          "Please upload Training Completion Certificate",
          "warning",
        );
        return;
      }
    }

    if (stepId === 12) {
      const missing = [];
      if (!lead.s9_secondInstallmentReceived)
        missing.push("Installment status");
      if (!lead.s11_assignedTo)
        missing.push("Assign for Step 1: Subsidy Claim");

      if (missing.length > 0) {
        showNotification(
          "Please fill mandatory fields: " + missing.join(", "),
          "warning",
        );
        return;
      }
      if (
        lead.s9_secondInstallmentReceived === "Yes" &&
        (!lead.s9_secondInstallmentAmount ||
          !lead.s9_secondInstallmentUtr ||
          !lead.s9_secondInstallmentDate)
      ) {
        showNotification(
          "Please fill all installment details (Amount, UTR, Date)",
          "warning",
        );
        return;
      }
    }

    if (stepId === 13) {
      // Step 13 (Subsidy) is the final step, no "next" assignee.
    }

    if (stepId === 14) {
      if (!lead.s_newConn_appliedDate) {
        showNotification(
          "Please select New Connection Applied Date",
          "warning",
        );
        return;
      }
      if (!lead.s_newConn_uploadPhotosUrl) {
        showNotification("Please upload New Connection Photos", "warning");
        return;
      }
      if (!lead.executionNewConnectionPhotosUrl) {
        showNotification(
          "Please upload New Connection Photos (Project Details)",
          "warning",
        );
        return;
      }
    }

    const submittedField = `isStep${stepId}Submitted`;
    const extraUpdates: any = {};

    if (stepId === 3 && lead.loanRequired !== "Yes") {
      extraUpdates.isStep4Submitted = true;
    }

    await handleUpdate({
      updatedAt: new Date() as any,
      [submittedField]: true,
      ...extraUpdates,
    });
    setSaveSuccess(stepId);
    showNotification("Section updated and locked successfully!", "success");
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const [kwOptions, setKwOptions] = useState<string[]>([]);
  useEffect(() => {
    if (lead?.phase) {
      kwService.getKwOptions(lead.phase).then(setKwOptions);
    } else {
      setKwOptions([]);
    }
  }, [lead?.phase]);

  const dcrOptions = useMemo(() => {
    if (lead?.connectionType === "DS") {
      return ["DCR", "NDCR", "Mix (DCR + NDCR)"];
    }
    if (lead?.connectionType === "NDS") {
      return ["NDCR"];
    }
    return [];
  }, [lead?.connectionType]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    fieldName: keyof Lead,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !lead) return;

    // Check PDF/Image format
    const isPhotoField =
      fieldName.toString().toLowerCase().includes("photo") ||
      fieldName.toString().startsWith("s6_photo") ||
      fieldName === "s8_convertedPhotoUrl" ||
      fieldName === "gpsUrl" ||
      fieldName === "meterUrl" ||
      fieldName === "s5_preInstallPhotoUrl" ||
      fieldName === "s_newConn_uploadPhotosUrl";
    if (isPhotoField) {
      const allowedImageExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".svg",
        ".heic",
      ];
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const isImage =
        file.type.startsWith("image/") ||
        allowedImageExtensions.some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        );

      if (!isPdf && !isImage) {
        showNotification(
          "Only PDF documents and image files are allowed for photos.",
          "error",
        );
        return;
      }
    } else {
      // Check PDF format
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        showNotification(
          "Only PDF documents are allowed across all sections.",
          "error",
        );
        return;
      }
    }

    // Check file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification("File is too large. Max size is 5MB.", "error");
      return;
    }

    setUploadingDoc(docType);
    setUploadProgress(0);
    setUploadError(null);
    console.log(
      `[UI] Initializing upload for ${docType}. File:`,
      file.name,
      "Size:",
      (file.size / 1024).toFixed(2),
      "KB",
    );

    try {
      if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
      }

      const url = await storageService.uploadLeadDocument(
        leadId,
        file,
        docType,
        (progress) => setUploadProgress(progress),
      );

      if (!url) {
        throw new Error("Upload succeeded but no link was returned.");
      }

      console.log(`Upload successful for ${docType}:`, url);
      await handleUpdate({ [fieldName]: url });

      // Reset input value
      e.target.value = "";
    } catch (error: any) {
      console.error(`[UI] Upload failed for ${docType}:`, error);

      // Extract the most readable message possible
      const message =
        error.message || "An unexpected error occurred during upload.";

      setUploadError(`${docType}: ${message}`);
      // Show notification for immediate feedback
      showNotification(`Upload Failed: ${message}`, "error");
    } finally {
      setUploadingDoc(null);
      setUploadProgress(0);
    }
  };

  const getDocStatus = (url?: string) => {
    if (!url) return "Missing";
    return "Uploaded";
  };

  const docFields: Record<string, keyof Lead> = {
    "Electricity Bill": "billUrl",
    "Site Drawings": "drawingUrl",
    "GPS photo of Site/Roof": "gpsUrl",
    "Meter Photo": "meterUrl",
  };

  const financialDocFields: Record<string, keyof Lead> = {
    "Aadhaar Card": "aadhaarUrl",
    "Cheque Book/Pass Book": "bankDocUrl",
    "PAN Card": "panUrl",
    "Property Certificate": "propertyCertUrl",
    "Work Agreement": "workAgreementUrl",
    "Model Agreement": "modelAgreementUrl",
    "Co-applicant Document": "coApplicantDocUrl",
    "Property Ownership": "loadPropertyUrl",
  };

  const handleDelete = async () => {
    try {
      await leadService.deleteLead(leadId);
      onBack();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (loading)
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h3>
        <p className="text-slate-500 text-center max-w-md mb-6">{error}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-semibold"
        >
          Go Back
        </button>
      </div>
    );

  if (!lead)
    return (
      <div className="text-center py-12 text-slate-500">Lead not found.</div>
    );

  if (!isAdminUser && !isSteward && !isAssignedToLead) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-lg mx-auto my-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-2" />
        <h3 className="text-xl font-bold text-slate-900">Access Denied</h3>
        <p className="text-slate-500 max-w-md">
          You are not authorized to view or access this lead. Only users
          involved in this lead can access this section.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all active:scale-95"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 z-[110] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === "success"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : notification.type === "error"
                  ? "bg-rose-600 border-rose-500 text-white"
                  : "bg-emerald-500 border-emerald-400 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : notification.type === "error" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="font-bold text-sm">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Navigation Guard */}
      <div className="sticky top-0 z-40 space-y-3 bg-slate-50/90 backdrop-blur-md pt-2 pb-3 -mx-4 px-4 border-b border-slate-200/50">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {lead.customerName}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                    lead.status === "Completed"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                      : lead.status === "Won" || lead.status === "Converted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : lead.status === "Lost"
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                  }`}
                >
                  {lead.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-[10px] font-medium text-slate-400 mt-0.5">
                <p className="flex items-center gap-1">
                  <UserIcon className="w-2.5 h-2.5" />
                  ID:{" "}
                  <span className="text-slate-600 font-mono">
                    {lead.leadId || "Pending"}
                  </span>
                </p>
                {lead.mobileNumber && (
                  <p className="flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" />
                    <span className="text-slate-600 font-mono">
                      {lead.mobileNumber}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Layout */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 relative ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">
                {tab.id === "project_incharge"
                  ? "Control"
                  : tab.id === "financials"
                    ? "Details"
                    : tab.label.split(" ")[0]}
              </span>
              {shouldHighlightTab(tab.id) && (
                <span className="absolute -top-1 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 min-h-[500px]">
        {isTabInaccessible(activeTab).blocked ? (
          <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center max-w-2xl mx-auto space-y-6 my-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                This Stage is Locked
              </h3>
              <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed">
                {isTabInaccessible(activeTab).reason}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6 w-full text-left space-y-3">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Required Sequence Actions
              </h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-3 text-xs md:text-sm font-semibold text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">
                    1
                  </span>
                  <span>
                    Submit preceding section:{" "}
                    <strong className="text-slate-900 font-bold">
                      {isTabInaccessible(activeTab).missingStep ||
                        "Previous Section"}
                    </strong>
                  </span>
                </li>
                {isTabInaccessible(activeTab).missingAssignee && (
                  <li className="flex items-center gap-3 text-xs md:text-sm font-semibold text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">
                      2
                    </span>
                    <span>
                      Assign a responsible user/team for:{" "}
                      <strong className="text-slate-900 font-bold">
                        {isTabInaccessible(activeTab).missingAssignee}
                      </strong>
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <button
              onClick={onBack}
              className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            {activeTab === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="col-span-full pb-3 border-b border-slate-50 mb-2 md:mb-4">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                    Section A: Lead Capture
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">
                    Initial registration and core customer details.
                  </p>
                </div>
                <InputField
                  label="Lead ID"
                  value={lead.leadId}
                  name="leadId"
                  onUpdate={handleUpdate}
                  disabled
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Creator
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-medium">
                    {formatCreatorName(lead.createdByName, lead.createdBy)}
                  </div>
                </div>
                <InputField
                  label="Email Address"
                  value={lead.customerEmail}
                  name="customerEmail"
                  type="email"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Date"
                  value={lead.punchDate}
                  name="punchDate"
                  type="date"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Customer Name"
                  value={lead.customerName}
                  name="customerName"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Mobile Number"
                  value={lead.mobileNumber}
                  name="mobileNumber"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Address"
                  value={lead.address}
                  name="address"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Reference"
                  value={lead.reference}
                  name="reference"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Required KW"
                  value={lead.requiredKw}
                  name="requiredKw"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Assign To Sales Team (Pre-Sales)"
                  value={lead.assignedPreSalesName || lead.assignedPreSales}
                  name="assignedPreSalesName"
                  options={users.map((u) => u.name)}
                  onUpdate={(updates) => {
                    const selectedUser = users.find(
                      (u) => u.name === updates.assignedPreSalesName,
                    );
                    handleUpdate({
                      ...updates,
                      assignedPreSalesName:
                        selectedUser?.name || updates.assignedPreSalesName,
                      assignedPreSales:
                        selectedUser?.email || lead.assignedPreSales,
                    });
                  }}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Remark"
                  value={lead.remarkInitial}
                  name="remarkInitial"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <InputField
                  label="Plan Site Visit Date"
                  value={lead.planSiteVisitDate}
                  name="planSiteVisitDate"
                  type="date"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("basic")}
                />
                <div className="col-span-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Save Basic Information
                    </span>
                    <p className="text-[11px] md:text-xs text-slate-400 font-medium">
                      Capture initial customer registration details.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (
                          !lead.customerName ||
                          !lead.mobileNumber ||
                          !lead.address ||
                          !lead.requiredKw ||
                          !lead.assignedPreSalesName ||
                          !lead.planSiteVisitDate
                        ) {
                          showNotification(
                            "Please fill all the fields",
                            "warning",
                          );
                          return;
                        }
                        handleUpdate(
                          {
                            isBasicSubmitted: true,
                            updatedAt: new Date() as any,
                          },
                          true,
                        );
                      }}
                      disabled={isSaving || !canEditTab("basic")}
                      className="w-full md:w-auto px-6 md:px-10 py-2.5 md:py-3 bg-zinc-900 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {isSaving ? (
                        <Clock className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                      Submit Basic Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pre_sales" && (
              <div
                className={`space-y-6 md:space-y-8 p-4 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-500 bg-white border border-slate-100 shadow-xl ${shouldHighlightTab("pre_sales") ? "ring-2 md:ring-4 ring-amber-400 ring-offset-2 shadow-2xl bg-amber-50/20 scale-[1.002]" : ""}`}
              >
                {shouldHighlightTab("pre_sales") && (
                  <div className="mb-2">
                    <span className="inline-flex bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest items-center gap-1.5 border border-orange-400">
                      <AlertCircle className="w-3 h-3" /> ACTION ASSIGNED TO YOU
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  <div className="col-span-full pb-3 border-b border-slate-50 mb-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                      Pre-Sales Discussion
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400">
                      Initial client interaction and lead qualification by the
                      sales team.
                    </p>
                  </div>

                  <InputField
                    label="Assign for Survey (Next Phase)"
                    value={lead.assignedToName || lead.assignedTo}
                    name="assignedToName"
                    options={users.map((u) => u.name)}
                    onUpdate={(updates) => {
                      const selectedUser = users.find(
                        (u) => u.name === updates.assignedToName,
                      );
                      handleUpdate({
                        ...updates,
                        assignedToName:
                          selectedUser?.name || updates.assignedToName,
                        assignedTo: selectedUser?.email || lead.assignedTo,
                      });
                    }}
                    disabled={!canEditTab("pre_sales")}
                  />

                  <InputField
                    label="Pre-Sales Status"
                    value={lead.preSalesStatus || "Pending"}
                    name="preSalesStatus"
                    options={["Pending", "Discussion Done", "Not Interested"]}
                    onUpdate={handleUpdate}
                    disabled={!canEditTab("pre_sales")}
                  />

                  <InputField
                    label="Discussion Remark"
                    value={lead.preSalesRemark}
                    name="preSalesRemark"
                    multiline
                    rows={3}
                    onUpdate={handleUpdate}
                    disabled={!canEditTab("pre_sales")}
                  />
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Complete Pre-Sales Discussion
                    </span>
                    <p className="text-[11px] md:text-xs text-slate-400 font-medium">
                      Forward to Site Survey.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!lead.assignedToName) {
                        showNotification(
                          "Please select a surveyor before completing.",
                          "warning",
                        );
                        return;
                      }
                      handleUpdate(
                        {
                          isPreSalesSubmitted: true,
                          updatedAt: new Date() as any,
                          stepAssignmentDates: {
                            ...lead.stepAssignmentDates,
                            survey: new Date().toISOString(),
                          },
                          stepCompletionDates: {
                            ...lead.stepCompletionDates,
                            pre_sales: new Date().toISOString(),
                          },
                        },
                        true,
                      );
                    }}
                    disabled={
                      isSaving ||
                      !canEditTab("pre_sales") ||
                      lead.isPreSalesSubmitted
                    }
                    className="w-full md:w-auto px-6 md:px-10 py-2.5 md:py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
                  >
                    {isSaving ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {lead.isPreSalesSubmitted
                      ? "Forwarded"
                      : "Forward to Survey"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "survey" && (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-500 bg-white border border-slate-100 shadow-xl ${shouldHighlightTab("survey") ? "ring-2 md:ring-4 ring-amber-400 ring-offset-2 shadow-2xl bg-amber-50/20 scale-[1.002]" : ""}`}
              >
                {shouldHighlightTab("survey") && (
                  <div className="col-span-full mb-2">
                    <span className="inline-flex bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] md:text-[10px] font-black uppercase px-3 py-1 md:py-1.5 rounded-full shadow-lg animate-pulse tracking-widest items-center gap-1.5 border border-orange-400">
                      <AlertCircle className="w-3 md:w-3.5 h-3 md:h-3.5" />{" "}
                      ACTION ASSIGNED TO YOU
                    </span>
                  </div>
                )}
                <div className="col-span-full pb-3 border-b border-slate-50 mb-2">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                    Section B: Site Survey & Tech Specs
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">
                    Field report and technical feasibility data.
                  </p>
                </div>
                <InputField
                  label="Site Visit Date"
                  value={lead.siteVisitDate}
                  name="siteVisitDate"
                  type="date"
                  max={format(new Date(), "yyyy-MM-dd")}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Visited By"
                  value={lead.visitedBy}
                  name="visitedBy"
                  options={users.map((u) => u.name)}
                  onUpdate={(updates) => {
                    const selectedUser = users.find(
                      (u) => u.name === updates.visitedBy,
                    );
                    handleUpdate({
                      ...updates,
                      visitedBy: selectedUser?.name || updates.visitedBy,
                      visitedByEmail:
                        selectedUser?.email || lead.visitedByEmail,
                    });
                  }}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Roof Type"
                  value={lead.roofType}
                  name="roofType"
                  options={["RCC", "Tin", "Mix(RCC+Tin)", "Asbestos"]}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Shadow Issue"
                  value={lead.shadowIssue}
                  name="shadowIssue"
                  options={["No", "Yes"]}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Within City / Outside City"
                  value={lead.locationType}
                  name="locationType"
                  options={["Jaipur", "Outside Jaipur"]}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Phase"
                  value={lead.phase}
                  name="phase"
                  options={["1 Phase", "3 Phase"]}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Final KW"
                  value={lead.finalKw}
                  name="finalKw"
                  options={kwOptions}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Connection Type"
                  value={lead.connectionType}
                  name="connectionType"
                  options={[
                    { value: "DS", label: "DS (Domestic)" },
                    { value: "NDS", label: "NDS (Non-Domestic)" },
                  ]}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="DCR / NDCR"
                  value={lead.dcrType}
                  name="dcrType"
                  options={dcrOptions}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Std. Package"
                  value={lead.stdPackage}
                  name="stdPackage"
                  options={["Diamond", "Gold", "Silver"]}
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />
                <InputField
                  label="Brand"
                  value={lead.brand}
                  name="brand"
                  onUpdate={handleUpdate}
                  disabled={!canEditTab("survey")}
                />

                <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" />
                    Rates & Deviations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputField
                      label="Current Rate (Calculated)"
                      value={lead.originalRate}
                      name="originalRate"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled
                    />
                    <InputField
                      label="Deviation / Extra Notes"
                      value={lead.rateDeviationNotes}
                      name="rateDeviationNotes"
                      options={["No", "Yes"]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("survey")}
                    />
                    {lead.rateDeviationNotes === "Yes" && (
                      <>
                        <InputField
                          label="Deviation Details"
                          value={lead.deviationDetails}
                          name="deviationDetails"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("survey")}
                        />
                        <InputField
                          label="Deviation Cost (₹)"
                          value={lead.deviationCost}
                          name="deviationCost"
                          type="number"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("survey")}
                        />
                      </>
                    )}
                    <InputField
                      label="Rate After Deviation"
                      value={lead.rateAfterDeviation}
                      name="rateAfterDeviation"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled
                    />
                  </div>
                </div>

                <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-400" />
                    Required Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(docFields).map(([docType, fieldName]) => {
                      const url = (lead as any)[fieldName];
                      const isUploading = uploadingDoc === docType;

                      return (
                        <div
                          key={docType}
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${url ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {url ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : isUploading ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}

                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-600">
                              {docType}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${url ? "text-emerald-600" : "text-slate-400"}`}
                            >
                              {isUploading
                                ? `Syncing... ${uploadProgress > 0 ? Math.round(uploadProgress) + "%" : ""}`
                                : getDocStatus(url)}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <label
                              htmlFor={`input-${docType.replace(/\s+/g, "-").toLowerCase()}`}
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${isUploading || !canEditTab("survey") ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {url ? "Replace" : "Upload"}
                              <input
                                id={`input-${docType.replace(/\s+/g, "-").toLowerCase()}`}
                                type="file"
                                className="hidden"
                                accept={
                                  fieldName === "gpsUrl" ||
                                  fieldName === "meterUrl"
                                    ? "image/*,application/pdf"
                                    : "application/pdf"
                                }
                                onChange={(e) =>
                                  handleFileUpload(e, docType, fieldName)
                                }
                                disabled={isUploading || !canEditTab("survey")}
                              />
                            </label>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <InputField
                      label="Smart meter installed"
                      value={lead.smartMeterInstalled}
                      name="smartMeterInstalled"
                      options={["Yes", "No"]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("survey")}
                    />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    Next Phase Assignment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputField
                      label="Assign for Sales"
                      value={lead.assignedSales}
                      name="assignedSales"
                      options={users.map((u) => u.name)}
                      onUpdate={(updates) => {
                        const selectedUser = users.find(
                          (u) => u.name === updates.assignedSales,
                        );
                        handleUpdate({
                          ...updates,
                          assignedSales:
                            selectedUser?.name || updates.assignedSales,
                          assignedSalesEmail:
                            selectedUser?.email || lead.assignedSalesEmail,
                        });
                      }}
                      disabled={!canEditTab("survey")}
                    />
                  </div>
                </div>

                <div className="col-span-full flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Finalize Site Survey
                    </span>
                    <p className="text-xs text-slate-400 font-medium">
                      Click save to confirm all technical data entry.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        if (
                          !lead.siteVisitDate ||
                          !lead.visitedBy ||
                          !lead.roofType ||
                          !lead.shadowIssue ||
                          !lead.locationType ||
                          !lead.phase ||
                          !lead.finalKw ||
                          !lead.connectionType ||
                          !lead.dcrType ||
                          !lead.stdPackage ||
                          !lead.assignedSales ||
                          !lead.smartMeterInstalled
                        ) {
                          showNotification(
                            "Please fill all the fields (including Smart Meter & Sales Person assignment)",
                            "warning",
                          );
                          return;
                        }

                        if (
                          !lead.billUrl ||
                          !lead.drawingUrl ||
                          !lead.gpsUrl ||
                          !lead.meterUrl
                        ) {
                          showNotification(
                            "Please upload all documents",
                            "warning",
                          );
                          return;
                        }

                        handleUpdate(
                          {
                            isSurveySubmitted: true,
                            updatedAt: new Date() as any,
                          },
                          false,
                        );
                      }}
                      disabled={isSaving || !canEditTab("survey")}
                      className="w-full md:w-auto px-10 py-3 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {isSaving ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Submit & Lock Survey
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sales" && (
              <div
                className={`space-y-8 p-6 md:p-8 rounded-3xl transition-all duration-500 ${shouldHighlightTab("sales") ? "ring-4 ring-amber-400 ring-offset-2 shadow-2xl bg-amber-50/20 scale-[1.005]" : ""}`}
              >
                {shouldHighlightTab("sales") && (
                  <div className="mb-4">
                    <span className="inline-flex bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest items-center gap-1.5 border border-orange-400">
                      <AlertCircle className="w-3.5 h-3.5" /> ACTION ASSIGNED TO
                      YOU
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                  <div className="col-span-full pb-4 border-b border-slate-100">
                    <h1 className="text-lg font-bold text-slate-900">
                      Sales Progression & Follow-ups
                    </h1>
                    <p className="text-sm text-slate-400">
                      Section C: Manage lead status and capture follow-up
                      details.
                    </p>
                  </div>

                  <InputField
                    label="Current Status"
                    value={lead.status}
                    name="status"
                    options={[
                      "New",
                      "Under Discussion",
                      "Negotiation",
                      "Won",
                      "Lost",
                    ]}
                    onUpdate={handleUpdate}
                    disabled={!canEditTab("sales")}
                  />

                  {(lead.status === "Under Discussion" ||
                    lead.status === "Negotiation") && (
                    <InputField
                      label="Next Follow-up Date"
                      value={lead.nextFollowUpDate}
                      name="nextFollowUpDate"
                      type="date"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("sales")}
                    />
                  )}

                  {lead.status === "Lost" && (
                    <InputField
                      label="Lost Reason"
                      value={lead.lostReason}
                      name="lostReason"
                      options={[
                        "Price is too high",
                        "Quality is not as required",
                        "Material not available",
                        "All decide later",
                        "Finalised other",
                        "Other",
                      ]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("sales")}
                    />
                  )}

                  {lead.status === "Won" && (
                    <InputField
                      label="Assign for Project Details"
                      value={lead.projectAssignee}
                      name="projectAssignee"
                      options={users.map((u) => u.name)}
                      onUpdate={(updates) => {
                        const selectedUser = users.find(
                          (u) => u.name === updates.projectAssignee,
                        );
                        handleUpdate({
                          ...updates,
                          projectAssignee:
                            selectedUser?.name || updates.projectAssignee,
                          projectAssigneeEmail:
                            selectedUser?.email || lead.projectAssigneeEmail,
                        });
                      }}
                      disabled={!canEditTab("sales")}
                    />
                  )}

                  <InputField
                    label="Section Sales Assignee"
                    value={lead.assignedSales}
                    name="assignedSales"
                    options={users.map((u) => u.name)}
                    onUpdate={(updates) => {
                      const selectedUser = users.find(
                        (u) => u.name === updates.assignedSales,
                      );
                      handleUpdate({
                        ...updates,
                        assignedSales:
                          selectedUser?.name || updates.assignedSales,
                        assignedSalesEmail:
                          selectedUser?.email || lead.assignedSalesEmail,
                      });
                    }}
                    disabled={!canEditTab("sales")}
                  />

                  <InputField
                    label="Interaction Remark"
                    value={lead.salesRemark}
                    name="salesRemark"
                    multiline
                    rows={3}
                    placeholder="Enter what happened during this interaction..."
                    onUpdate={handleUpdate}
                    disabled={!canEditTab("sales")}
                  />

                  <div className="col-span-full flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-8 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {lead.status === "Won"
                          ? "Finalize & Move to Project Details"
                          : lead.status === "Lost"
                            ? "Mark as Lost"
                            : "Submit Follow-up"}
                      </span>
                      <p className="text-xs text-slate-400 font-medium">
                        {lead.status === "Won"
                          ? "This will lock the sales section and notify the project incharge."
                          : "This will add a record to the follow-up history."}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          if (
                            !lead.status ||
                            !lead.assignedSales ||
                            !lead.salesRemark
                          ) {
                            showNotification(
                              "Please fill Status, Remark & Sales Person",
                              "warning",
                            );
                            return;
                          }
                          if (
                            (lead.status === "Under Discussion" ||
                              lead.status === "Negotiation") &&
                            !lead.nextFollowUpDate
                          ) {
                            showNotification(
                              "Please select next follow-up date",
                              "warning",
                            );
                            return;
                          }
                          if (lead.status === "Lost" && !lead.lostReason) {
                            showNotification("Enter lost reason", "warning");
                            return;
                          }
                          if (lead.status === "Won" && !lead.projectAssignee) {
                            showNotification(
                              "Please assign a Project Incharge for the next phase",
                              "warning",
                            );
                            return;
                          }

                          const newFollowUp = {
                            date: new Date().toISOString(),
                            status: lead.status,
                            remark: lead.salesRemark,
                            nextFollowUpDate: lead.nextFollowUpDate || null,
                            timestamp: new Date(),
                          };

                          const followUps = [
                            ...(lead.followUps || []),
                            newFollowUp,
                          ];
                          const isFinal =
                            lead.status === "Won" || lead.status === "Lost";

                          handleUpdate(
                            {
                              followUps,
                              isSalesSubmitted: isFinal,
                              updatedAt: new Date() as any,
                              ...(isFinal
                                ? {}
                                : { salesRemark: "", nextFollowUpDate: "" }),
                            },
                            false,
                          );
                        }}
                        disabled={isSaving || !canEditTab("sales")}
                        className={`w-full md:w-auto px-10 py-3 ${lead.status === "Won" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"} text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all shadow-lg`}
                      >
                        {isSaving ? (
                          <Clock className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                        {lead.status === "Won"
                          ? "Finalize Won Lead"
                          : lead.status === "Lost"
                            ? "Confirm Lost"
                            : "Submit Interaction"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interaction History */}
                {lead.followUps && lead.followUps.length > 0 && (
                  <div className="mt-12 bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                        <History className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Interaction History
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Timeline of all sales follow-ups and status changes.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[...lead.followUps].reverse().map((fw, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-start gap-4"
                        >
                          <div className="md:w-32 shrink-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Date
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                              {format(new Date(fw.date), "dd MMM yyyy")}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400">
                              {format(new Date(fw.date), "hh:mm a")}
                            </div>
                          </div>

                          <div className="md:w-40 shrink-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Status
                            </div>
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                fw.status === "Won"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : fw.status === "Lost"
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {fw.status}
                            </span>
                          </div>

                          <div className="flex-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Remark
                            </div>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                              {fw.remark}
                            </p>
                            {fw.nextFollowUpDate && (
                              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                  Next Follow-up:{" "}
                                  {format(
                                    new Date(fw.nextFollowUpDate),
                                    "dd MMM yyyy",
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "financials" && (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-500 bg-white border border-slate-100 shadow-xl ${shouldHighlightTab("financials") ? "ring-2 md:ring-4 ring-amber-400 ring-offset-2 shadow-2xl bg-amber-50/20 scale-[1.002]" : ""}`}
              >
                {shouldHighlightTab("financials") && (
                  <div className="col-span-full mb-2">
                    <span className="inline-flex bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] md:text-[10px] font-black uppercase px-3 py-1 md:py-1.5 rounded-full shadow-lg animate-pulse tracking-widest items-center gap-1.5 border border-orange-400">
                      <AlertCircle className="w-3 md:w-3.5 h-3 md:h-3.5" />{" "}
                      ACTION ASSIGNED TO YOU
                    </span>
                  </div>
                )}
                <div className="col-span-full pb-3 border-b border-slate-50 mb-2">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                    Project Details
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">
                    Section D: Project specs, load extension, and loan status.
                  </p>
                </div>

                {/* New Connection Section (On Top) */}
                <div className="col-span-full pt-2">
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-400" />
                    New Connection
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputField
                      label="New Connection Required"
                      value={lead.newConnectionRequired}
                      name="newConnectionRequired"
                      options={["Yes", "No"]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />

                    {lead.newConnectionRequired === "Yes" && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Property Documents
                          </label>
                          <div
                            className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-all ${lead.newConnectionPhotosUrl ? "border-emerald-200 bg-emerald-50/40" : "bg-white border-slate-200"}`}
                          >
                            {lead.newConnectionPhotosUrl ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Upload className="w-4 h-4 text-slate-400" />
                            )}

                            {uploadingDoc === "New Connection Photos" ? (
                              <div className="flex-1 flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-8">
                                  {uploadProgress > 0
                                    ? `${Math.round(uploadProgress)}%`
                                    : "Wait..."}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={`flex-1 text-sm truncate font-semibold ${lead.newConnectionPhotosUrl ? "text-emerald-700 font-semibold" : "text-slate-700 font-medium"}`}
                              >
                                {lead.newConnectionPhotosUrl
                                  ? "Document Uploaded"
                                  : "No file chosen"}
                              </div>
                            )}

                            <label
                              htmlFor="input-new-connection-photos"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "New Connection Photos" || !canEditTab("financials") ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.newConnectionPhotosUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-new-connection-photos"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "New Connection Photos",
                                    "newConnectionPhotosUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "New Connection Photos" ||
                                  !canEditTab("financials")
                                }
                              />
                            </label>
                            {lead.newConnectionPhotosUrl && (
                              <a
                                href={lead.newConnectionPhotosUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                        <InputField
                          label="Details"
                          value={lead.newConnectionDetails}
                          name="newConnectionDetails"
                          type="textarea"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("financials")}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Load Extension Required Section (Below New Connection) */}
                {lead.newConnectionRequired !== "Yes" && (
                  <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                    <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-slate-400" />
                      Load Extension Required
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <InputField
                        label="Load Extension Required"
                        value={lead.loadExtensionRequired}
                        name="loadExtensionRequired"
                        options={["Yes", "No"]}
                        onUpdate={handleUpdate}
                        disabled={!canEditTab("financials")}
                      />

                      {lead.loadExtensionRequired === "Yes" && (
                        <>
                          <InputField
                            label="Required KW"
                            value={lead.loadExtensionKw}
                            name="loadExtensionKw"
                            onUpdate={handleUpdate}
                            disabled={!canEditTab("financials")}
                          />
                          <div
                            className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.loadPropertyUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                          >
                            <div className="flex items-center gap-2">
                              {lead.loadPropertyUrl ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : uploadingDoc === "Property Ownership" ? (
                                <div className="relative">
                                  <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                    {uploadProgress > 0
                                      ? `${Math.round(uploadProgress)}%`
                                      : "Sync..."}
                                  </span>
                                </div>
                              ) : (
                                <Upload className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="text-xs font-semibold text-slate-600">
                                Property Ownership Docs
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <label
                                htmlFor="input-property-ownership"
                                className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Property Ownership" || !canEditTab("financials") ? "opacity-50 pointer-events-none" : ""}`}
                              >
                                {lead.loadPropertyUrl
                                  ? "Replace"
                                  : "Click to upload"}
                                <input
                                  id="input-property-ownership"
                                  type="file"
                                  className="hidden"
                                  accept="application/pdf"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      "Property Ownership",
                                      "loadPropertyUrl",
                                    )
                                  }
                                  disabled={
                                    uploadingDoc === "Property Ownership" ||
                                    !canEditTab("financials")
                                  }
                                />
                              </label>
                              {lead.loadPropertyUrl && (
                                <a
                                  href={lead.loadPropertyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <InputField
                        label="Does Document Correction Required?"
                        value={lead.s_docCorr_required}
                        name="s_docCorr_required"
                        options={["Yes", "No"]}
                        onUpdate={handleUpdate}
                        disabled={!canEditTab("financials")}
                      />

                      {lead.s_docCorr_required === "Yes" && (
                        <InputField
                          label="Correction Remark"
                          value={lead.docCorrectionRemark}
                          name="docCorrectionRemark"
                          multiline
                          rows={2}
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("financials")}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Proposal Rates Section (Below Load Extension) */}
                <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    Proposal Rates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <InputField
                      label="Base Rate (from Survey)"
                      value={lead.originalRate}
                      name="originalRate"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled
                    />
                    <InputField
                      label="Deviation Cost"
                      value={lead.deviationCost}
                      name="deviationCost"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />
                    <InputField
                      label="Rate After Deviation"
                      value={lead.rateAfterDeviation}
                      name="rateAfterDeviation"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />
                    <InputField
                      label="Discount (Subtract)"
                      value={lead.discount}
                      name="discount"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />
                    <InputField
                      label="Final Proposal Rate"
                      value={lead.finalRate}
                      name="finalRate"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled
                    />
                  </div>
                </div>

                {/* Loan Requirements Section */}
                <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    Loan Requirements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <InputField
                      label="Loan Required"
                      value={lead.loanRequired}
                      name="loanRequired"
                      options={["Yes", "No"]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />

                    <InputField
                      label="Mail ID"
                      value={lead.customerMailId}
                      name="customerMailId"
                      type="email"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />

                    {lead.loanRequired !== undefined &&
                      lead.loanRequired !== "" && (
                        <>
                          {lead.loanRequired === "Yes" && (
                            <>
                              <InputField
                                label="Loan Amount"
                                value={lead.loanAmount}
                                name="loanAmount"
                                type="number"
                                onUpdate={handleUpdate}
                                disabled={!canEditTab("financials")}
                              />
                              <InputField
                                label="Margin Amount"
                                value={lead.marginAmount}
                                name="marginAmount"
                                type="number"
                                onUpdate={handleUpdate}
                                disabled={!canEditTab("financials")}
                              />

                            </>
                          )}

                          {/* Common Files for Loan Yes/No */}
                          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            {Object.entries(financialDocFields)
                              .filter(([docType]) => {
                                if (lead.loanRequired === "No") {
                                  return (
                                    docType === "Aadhaar Card" ||
                                    docType === "Cheque Book/Pass Book" ||
                                    docType === "Work Agreement" ||
                                    docType === "Model Agreement"
                                  );
                                }
                                return docType !== "Property Ownership"; // handled above
                              })
                              .map(([docType, fieldName]) => {
                                const url = (lead as any)[fieldName];
                                const isUploading = uploadingDoc === docType;
                                const fileCard = (
                                  <div
                                    key={docType}
                                    className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${url ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                                  >
                                    {url ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : isUploading ? (
                                      <div className="relative">
                                        <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                          {Math.round(uploadProgress)}%
                                        </span>
                                      </div>
                                    ) : (
                                      <Upload className="w-5 h-5 text-slate-400" />
                                    )}

                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-slate-600">
                                        {docType} {docType === "Co-applicant Document" && <span className="text-[10px] text-slate-400 font-normal block">(Optional)</span>}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold ${url ? "text-emerald-600" : "text-slate-400"}`}
                                      >
                                        {isUploading
                                          ? `Uploading... ${Math.round(uploadProgress)}%`
                                          : getDocStatus(url)}
                                      </span>
                                    </div>

                                    <div className="flex gap-2">
                                      <label
                                        htmlFor={`input-fin-${docType.replace(/\s+/g, "-").toLowerCase()}`}
                                        className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${isUploading || !canEditTab("financials") ? "opacity-50 pointer-events-none" : ""}`}
                                      >
                                        {url ? "Replace" : "Upload"}
                                        <input
                                          id={`input-fin-${docType.replace(/\s+/g, "-").toLowerCase()}`}
                                          type="file"
                                          className="hidden"
                                          accept="application/pdf"
                                          onChange={(e) =>
                                            handleFileUpload(
                                              e,
                                              docType,
                                              fieldName,
                                            )
                                          }
                                          disabled={
                                            isUploading ||
                                            !canEditTab("financials")
                                          }
                                        />
                                      </label>
                                      {url && (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                          View{" "}
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );

                                if (docType === "Co-applicant Document" && lead.loanRequired === "Yes") {
                                  return (
                                    <React.Fragment key={docType}>
                                      <div className="col-span-1">
                                        <InputField
                                          label="Co-applicant"
                                          value={lead.coApplicant}
                                          name="coApplicant"
                                          onUpdate={handleUpdate}
                                          disabled={!canEditTab("financials")}
                                          placeholder="Co-applicant Name (Optional)"
                                        />
                                      </div>
                                      <div className="col-span-1">
                                        <InputField
                                          label="Co-applicant Remark"
                                          value={lead.coApplicantRemark}
                                          name="coApplicantRemark"
                                          onUpdate={handleUpdate}
                                          disabled={!canEditTab("financials")}
                                          placeholder="Co-applicant Remark (Optional)"
                                        />
                                      </div>
                                      {fileCard}
                                    </React.Fragment>
                                  );
                                }

                                return fileCard;
                              })}
                          </div>
                        </>
                      )}
                  </div>
                </div>

                <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-400" />
                    Project Detail & Advance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputField
                      label="Project Type"
                      value={lead.projectType}
                      name="projectType"
                      options={["PM Surya Ghar", "SSO", "Surya Ghar + SSO"]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />

                    {(lead.projectType === "SSO" ||
                      lead.projectType === "Surya Ghar + SSO") && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Passport Size Photo{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div
                            className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-all ${lead.ssoPassportPhotoUrl ? "border-emerald-200 bg-emerald-50/40" : "bg-white border-slate-200"}`}
                          >
                            {lead.ssoPassportPhotoUrl ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Upload className="w-4 h-4 text-slate-400" />
                            )}

                            {uploadingDoc === "Passport Photo" ? (
                              <div className="flex-1 flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-8">
                                  {uploadProgress > 0
                                    ? `${Math.round(uploadProgress)}%`
                                    : "Wait..."}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={`flex-1 text-sm truncate font-semibold ${lead.ssoPassportPhotoUrl ? "text-emerald-700 font-semibold" : "text-slate-700 font-medium"}`}
                              >
                                {lead.ssoPassportPhotoUrl
                                  ? "Document Uploaded"
                                  : "No file chosen"}
                              </div>
                            )}

                            <label
                              htmlFor="input-sso-passport"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Passport Photo" || !canEditTab("financials") ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.ssoPassportPhotoUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-sso-passport"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Passport Photo",
                                    "ssoPassportPhotoUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Passport Photo" ||
                                  !canEditTab("financials")
                                }
                              />
                            </label>
                            {lead.ssoPassportPhotoUrl && (
                              <a
                                href={lead.ssoPassportPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Signature (PDF){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div
                            className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-all ${lead.ssoSignatureUrl ? "border-emerald-200 bg-emerald-50/40" : "bg-white border-slate-200"}`}
                          >
                            {lead.ssoSignatureUrl ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Upload className="w-4 h-4 text-slate-400" />
                            )}

                            {uploadingDoc === "Signature" ? (
                              <div className="flex-1 flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-8">
                                  {uploadProgress > 0
                                    ? `${Math.round(uploadProgress)}%`
                                    : "Wait..."}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={`flex-1 text-sm truncate font-semibold ${lead.ssoSignatureUrl ? "text-emerald-700 font-semibold" : "text-slate-700 font-medium"}`}
                              >
                                {lead.ssoSignatureUrl
                                  ? "Signature Uploaded"
                                  : "No file chosen"}
                              </div>
                            )}

                            <label
                              htmlFor="input-sso-signature"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Signature" || !canEditTab("financials") ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.ssoSignatureUrl ? "Replace" : "Upload File"}
                              <input
                                id="input-sso-signature"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Signature",
                                    "ssoSignatureUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Signature" ||
                                  !canEditTab("financials")
                                }
                              />
                            </label>
                            {lead.ssoSignatureUrl && (
                              <a
                                href={lead.ssoSignatureUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="SSO ID & Password"
                          value={lead.ssoIdAndPassword}
                          name="ssoIdAndPassword"
                          type="text"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("financials")}
                        />
                      </>
                    )}

                    <InputField
                      label="Advance Received"
                      value={lead.advanceReceived}
                      name="advanceReceived"
                      options={["Yes", "No"]}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />

                    {lead.advanceReceived === "Yes" && (
                      <>
                        <InputField
                          label="Amount"
                          value={lead.tempAdvanceAmount}
                          name="tempAdvanceAmount"
                          type="number"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("financials")}
                        />
                        <InputField
                          label="UTR / URT No"
                          value={lead.tempAdvanceUrtNo}
                          name="tempAdvanceUrtNo"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("financials")}
                        />
                        <InputField
                          label="Advance Date"
                          value={lead.tempAdvanceDate}
                          name="tempAdvanceDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditTab("financials")}
                          max={new Date().toLocaleDateString("en-CA")}
                        />
                      </>
                    )}

                    <InputField
                      label="Assign for Accounts"
                      value={lead.accAssignee}
                      name="accAssignee"
                      options={users
                        .filter(
                          (u) =>
                            u.role === "Admin" || u.category === "Accountant",
                        )
                        .map((u) => u.name)}
                      onUpdate={(updates) => {
                        const selectedUser = users.find(
                          (u) => u.name === updates.accAssignee,
                        );
                        handleUpdate({
                          ...updates,
                          accAssignee:
                            selectedUser?.name || updates.accAssignee,
                          accAssigneeEmail:
                            selectedUser?.email || lead.accAssigneeEmail,
                        });
                      }}
                      disabled={!canEditTab("financials")}
                    />

                    <InputField
                      label="Select Sales Person/Sales Partner for Commission"
                      value={lead.commissionSalesPerson}
                      name="commissionSalesPerson"
                      options={commissionRoles
                        .filter((r) => r.role === 'Sales Person' || r.role === 'Sales Partner')
                        .map((r) => r.name)}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />

                    <InputField
                      label="Project Remark"
                      value={lead.projectRemark}
                      name="projectRemark"
                      multiline
                      rows={2}
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("financials")}
                    />
                  </div>
                </div>

                <div className="col-span-full flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Save Project Details & Data
                    </span>
                    <p className="text-xs text-slate-400 font-medium">
                      Click save to confirm proposal, loan and project
                      assignment.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        if (
                          !lead.projectType ||
                          !lead.advanceReceived ||
                          !lead.projectAssignee ||
                          !lead.accAssignee
                        ) {
                          showNotification(
                            "Please fill all the fields, including Accountant assignment",
                            "warning",
                          );
                          return;
                        }

                        if (
                          lead.projectType === "SSO" ||
                          lead.projectType === "Surya Ghar + SSO"
                        ) {
                          if (
                            !lead.ssoPassportPhotoUrl ||
                            !lead.ssoSignatureUrl ||
                            !lead.ssoIdAndPassword
                          ) {
                            showNotification(
                              "Please fill all mandatory SSO fields and upload documents",
                              "warning",
                            );
                            return;
                          }
                        }

                        if (
                          lead.advanceReceived === "Yes" &&
                          (!lead.tempAdvanceAmount ||
                            !lead.tempAdvanceUrtNo ||
                            !lead.tempAdvanceDate)
                        ) {
                          showNotification(
                            "Please fill all advance payment details",
                            "warning",
                          );
                          return;
                        }

                        const missingDocs = [];
                        if (!lead.aadhaarUrl) missingDocs.push("Aadhaar Card");
                        if (!lead.bankDocUrl)
                          missingDocs.push("Cheque Book/Pass Book");
                        if (lead.loanRequired === "Yes") {
                          if (!lead.panUrl) missingDocs.push("PAN Card");
                          if (!lead.propertyCertUrl)
                            missingDocs.push("Property Certificate");
                        }
                        if (!lead.workAgreementUrl)
                          missingDocs.push("Work Agreement");
                        if (!lead.modelAgreementUrl)
                          missingDocs.push("Model Agreement");
                        if (!lead.billUrl) missingDocs.push("Electricity Bill");
                        if (!lead.drawingUrl) missingDocs.push("Site Drawings");
                        if (!lead.gpsUrl)
                          missingDocs.push("GPS photo of Site/Roof");
                        if (!lead.meterUrl) missingDocs.push("Meter Photo");

                        if (missingDocs.length > 0) {
                          showNotification(
                            "Please upload all mandatory documents: " +
                              missingDocs.join(", "),
                            "warning",
                          );
                          return;
                        }

                        if (lead.loanRequired === "Yes") {
                          if (!lead.loanAmount || !lead.customerMailId) {
                            showNotification(
                              "Please fill loan details",
                              "warning",
                            );
                            return;
                          }
                        }

                        if (lead.newConnectionRequired === "Yes") {
                          if (!lead.newConnectionPhotosUrl) {
                            showNotification(
                              "Please upload all documents (New Connection Photos)",
                              "warning",
                            );
                            return;
                          }
                        }

                        if (lead.loadExtensionRequired === "Yes") {
                          if (!lead.loadExtensionKw) {
                            showNotification(
                              "Please fill load extension KW",
                              "warning",
                            );
                            return;
                          }
                          if (!lead.loadPropertyUrl) {
                            showNotification(
                              "Please upload all documents (Property Ownership)",
                              "warning",
                            );
                            return;
                          }
                        }

                        const proceed = async () => {
                          try {
                            const extraExecutionSetup: any = {};
                            if (lead.s_docCorr_required === "No") {
                              extraExecutionSetup.isStep1Submitted = true;
                              extraExecutionSetup.step1Status = "Bypassed";
                            }
                            if (lead.loadExtensionRequired === "No") {
                              extraExecutionSetup.isStep2Submitted = true;
                              extraExecutionSetup.step2Status = "Bypassed";
                            }
                            if (lead.loanRequired === "No") {
                              extraExecutionSetup.isStep4Submitted = true;
                              extraExecutionSetup.step4Status = "Bypassed";
                            }

                            await handleUpdate(
                              {
                                isFinancialsSubmitted: true,
                                updatedAt: new Date() as any,
                                ...extraExecutionSetup,
                              },
                              false,
                            );

                            showNotification(
                              "Project details submitted successfully!",
                              "success",
                            );
                          } catch (error) {
                            console.error(error);
                            showNotification(
                              "Error submitting project details or posting payment",
                              "error",
                            );
                          }
                        };
                        proceed();
                      }}
                      disabled={isSaving || !canEditTab("financials")}
                      className="w-full md:w-auto px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {isSaving ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Submit Project Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "accounts" && (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-500 bg-white border border-slate-100 shadow-xl ${shouldHighlightTab("accounts") ? "ring-2 md:ring-4 ring-amber-400 ring-offset-2 shadow-2xl bg-amber-50/20 scale-[1.002]" : ""}`}
              >
                {shouldHighlightTab("accounts") && (
                  <div className="col-span-full mb-2">
                    <span className="inline-flex bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] md:text-[10px] font-black uppercase px-3 py-1 md:py-1.5 rounded-full shadow-lg animate-pulse tracking-widest items-center gap-1.5 border border-orange-400">
                      <AlertCircle className="w-3 md:w-3.5 h-3 md:h-3.5" />{" "}
                      ACTION ASSIGNED TO YOU
                    </span>
                  </div>
                )}
                <div className="col-span-full pb-3 border-b border-slate-50 mb-2">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                    Account Confirmation
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">
                    Section G: Payment verification and account assignment.
                  </p>
                </div>

                <InputField
                  label="Payment Confirmation"
                  value={lead.accPaymentStatus}
                  name="accPaymentStatus"
                  options={["Confirmed", "No"]}
                  onUpdate={(updates) => {
                    const finalUpdates = { ...updates };
                    if (updates.accPaymentStatus === "Confirmed") {
                      if (lead.tempAdvanceAmount && !lead.accAmount)
                        finalUpdates.accAmount = lead.tempAdvanceAmount;
                      if (lead.tempAdvanceUrtNo && !lead.accUtrNo)
                        finalUpdates.accUtrNo = lead.tempAdvanceUrtNo;
                      if (lead.tempAdvanceDate && !lead.accDate)
                        finalUpdates.accDate = lead.tempAdvanceDate;
                    }
                    handleUpdate(finalUpdates);
                  }}
                  disabled={!canEditTab("accounts")}
                />

                {lead.accPaymentStatus === "Confirmed" && (
                  <>
                    <InputField
                      label="Amount"
                      value={lead.accAmount}
                      name="accAmount"
                      type="number"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("accounts")}
                    />
                    <InputField
                      label="UTR No"
                      value={lead.accUtrNo}
                      name="accUtrNo"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("accounts")}
                    />
                    <InputField
                      label="Date"
                      value={lead.accDate}
                      name="accDate"
                      type="date"
                      onUpdate={handleUpdate}
                      disabled={!canEditTab("accounts")}
                    />
                  </>
                )}

                <InputField
                  label="Assign Project Steward (Incharge)"
                  value={lead.projectInchargeName}
                  name="projectInchargeName"
                  options={users
                    .filter((u) => u.category === "Project Coordinator")
                    .map((u) => u.name)}
                  onUpdate={(updates) => {
                    const selectedUser = users.find(
                      (u) => u.name === updates.projectInchargeName,
                    );
                    handleUpdate({
                      ...updates,
                      projectInchargeName:
                        selectedUser?.name || updates.projectInchargeName,
                      projectInchargeEmail:
                        selectedUser?.email || lead.projectInchargeEmail,
                    });
                  }}
                  disabled={!canEditTab("accounts")}
                />

                <div className="col-span-full flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      Save Account Status
                    </span>
                    <p className="text-xs text-slate-400 font-medium">
                      Verify final payment details before moving to next stage.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        if (
                          !lead.accPaymentStatus ||
                          !lead.projectInchargeName
                        ) {
                          showNotification(
                            "Please fill all the fields (Payment Status, Project Steward)",
                            "warning",
                          );
                          return;
                        }

                        if (
                          lead.accPaymentStatus === "Confirmed" &&
                          (!lead.accAmount || !lead.accUtrNo || !lead.accDate)
                        ) {
                          showNotification(
                            "Please fill all payment confirmation details",
                            "warning",
                          );
                          return;
                        }

                        const proceed = async () => {
                          setIsSaving(true);
                          try {
                            const q = query(
                              collection(db, "payments"),
                              where("leadId", "==", lead.id),
                              where("paymentType", "==", "Advance"),
                            );
                            const paymentSnap = await getDocs(q);
                            const pendingDoc = paymentSnap.docs.find(
                              (d) => d.data().status === "Pending",
                            );
                            const confirmedDoc = paymentSnap.docs.find(
                              (d) => d.data().status === "Confirmed",
                            );

                            if (lead.accPaymentStatus === "Confirmed") {
                              if (pendingDoc) {
                                // Confirm the existing pending advance payment
                                await paymentService.confirmPayment(
                                  pendingDoc.id,
                                  {
                                    amount: Number(lead.accAmount),
                                    utrNo: lead.accUtrNo,
                                    date: lead.accDate,
                                    remarks:
                                      "Confirmed via Accounts Tab Submission",
                                  },
                                );
                              } else if (confirmedDoc) {
                                // Already confirmed, just update the document
                                // NOTE: We don't call confirmPayment again to prevent incrementing lead.payment_receivedAmount repeatedly
                                // We just update the payment document with the new values
                                await updateDoc(
                                  doc(db, "payments", confirmedDoc.id),
                                  {
                                    amount: Number(lead.accAmount),
                                    utrNo: lead.accUtrNo || "",
                                    date: lead.accDate || "",
                                  },
                                );
                              } else {
                                // Create and automatically confirm new payment
                                await paymentService.addPayment({
                                  leadId: lead.id,
                                  leadName: lead.customerName || "Unknown",
                                  amount: Number(lead.accAmount),
                                  utrNo: lead.accUtrNo || "",
                                  date: lead.accDate || "",
                                  paymentType: "Advance",
                                  remarks:
                                    "Confirmed via Accounts Tab Submission",
                                  status: "Confirmed",
                                  method: "Online",
                                });
                              }
                            } else if (
                              lead.accPaymentStatus === "No" &&
                              pendingDoc
                            ) {
                              // Reject the existing pending advance payment
                              await paymentService.rejectPayment(pendingDoc.id);
                            }

                            // Save accounts submission status
                            await handleUpdate(
                              {
                                isAccountsSubmitted: true,
                                updatedAt: new Date() as any,
                              },
                              false,
                            );

                            showNotification(
                              "Account details submitted and payment history updated!",
                              "success",
                            );
                          } catch (error) {
                            console.error(error);
                            showNotification(
                              "Error confirming payment or submitting details",
                              "error",
                            );
                          } finally {
                            setIsSaving(false);
                          }
                        };
                        proceed();
                      }}
                      disabled={isSaving || !canEditTab("accounts")}
                      className="w-full md:w-auto px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {isSaving ? (
                        <Clock className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                      Submit Account Details
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "project_incharge" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {/* Real-time Dashboard Header */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl md:rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-950 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[80px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full -ml-24 -mb-24 blur-[60px]" />

                    <div className="relative z-10 flex-1">
                      <div className="flex items-center gap-3 mb-3 md:mb-4">
                        <div className="h-px w-6 md:w-8 bg-blue-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-blue-400">
                          System Protocol Alpha
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-display font-bold mb-2 md:mb-3 tracking-tight md:tracking-tighter leading-tight bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
                        Project Management System (PMS)
                      </h3>
                      <p className="text-slate-400 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                        Centrally managing the installation lifecycle, resource
                        allocation, and real-time execution protocols across all
                        active operational phases.
                      </p>
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row xl:flex-col gap-4 md:gap-6 w-full lg:w-auto min-w-0 md:min-w-[280px]">
                      {/* Project Incharge Profile Card */}
                      <div className="flex items-center gap-3 md:gap-4 bg-white/5 backdrop-blur-3xl p-4 md:p-5 rounded-2xl border border-white/10 shadow-2xl shadow-black/40 ring-1 ring-white/10 group/profile">
                        <div className="relative">
                          <div className="absolute -inset-2 bg-blue-500 rounded-xl blur opacity-0 group-hover/profile:opacity-20 transition duration-500"></div>
                          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 block opacity-80">
                            Project In-Charge
                          </label>
                          <p className="text-lg font-display font-bold text-white leading-tight mb-1">
                            {lead.projectInchargeName ||
                              "Authorization Required"}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-xs text-slate-400 font-bold tracking-tight">
                              {lead.projectInchargeEmail ||
                                "Pending Steward Sync"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Operational Status Ticker */}
                      {(() => {
                        const activeSteps = [
                          { id: 1, active: lead.s_docCorr_required === "Yes" },
                          {
                            id: 2,
                            active: lead.loadExtensionRequired === "Yes",
                          },
                          { id: 3, active: true },
                          { id: 4, active: lead.loanRequired === "Yes" },
                          { id: 5, active: true },
                          { id: 6, active: true },
                          { id: 7, active: true },
                          { id: 8, active: true },
                          { id: 9, active: true },
                          { id: 10, active: true },
                          { id: 11, active: true },
                          { id: 12, active: lead.loanRequired === "Yes" },
                          { id: 13, active: true },
                        ].filter((s) => s.active);
                        const totalActive = activeSteps.length;
                        const submittedActive = activeSteps.filter(
                          (s) => (lead as any)[`isStep${s.id}Submitted`],
                        ).length;
                        const velocity =
                          totalActive > 0
                            ? Math.round((submittedActive / totalActive) * 100)
                            : 0;
                        return (
                          <div className="flex items-center justify-between gap-6 px-10 py-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/5">
                            <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Execution Velocity
                              </p>
                              <p className="text-xl font-bold font-mono text-emerald-400">
                                {velocity}%
                              </p>
                            </div>
                            <div className="h-10 w-px bg-white/10" />
                            <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Active Protocols
                              </p>
                              <p className="text-xl font-bold font-mono text-blue-400">
                                {submittedActive}/{totalActive}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {showCalendar && (
                  <div className="space-y-4 my-4">
                    <button
                      onClick={() =>
                        setShowAvailabilityCalendar(!showAvailabilityCalendar)
                      }
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                      id="toggle-detail-availability-calendar-btn"
                    >
                      <Calendar className="w-4 h-4 text-white" />
                      {showAvailabilityCalendar
                        ? "Hide Team Availability Calendar"
                        : "Show Team Availability Calendar"}
                    </button>
                    {showAvailabilityCalendar && (
                      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
                        <AvailabilityCalendar
                          users={users}
                          allTasks={allSystemTasks}
                          onSelectTask={(clickedLeadId, stepId, tab) => {
                            if (clickedLeadId === lead.id) {
                              if (tab) {
                                setActiveTab(tab);
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Roadmap Intelligence Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 mt-4">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                      Project Control Dashboard
                    </h3>
                    <p className="text-slate-500 font-medium max-w-xl">
                      Strategic governance sequence for lead{" "}
                      <span className="font-bold text-blue-600">
                        #{lead.id.slice(-6).toUpperCase()}
                      </span>
                      . Assign stewards, define timelines, and set operational
                      directives.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100/50">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1.5">
                        Network Sync
                      </p>
                      <p className="text-sm font-bold text-slate-900 leading-none">
                        Management Mode
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Task Sheet Metrics Scorecards */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6.5 mb-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-4.5 rounded bg-indigo-600 block"></span>
                        Execution Roadmap Stats
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Real-time status tracking for phase connection stages.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-1.5 w-fit">
                      {Math.round(
                        ((taskMetrics.completed + taskMetrics.bypassed) /
                          (taskMetrics.total || 1)) *
                          100,
                      )}
                      % Progress Overall
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      {
                        label: "Total Tasks",
                        val: taskMetrics.total,
                        bg: "bg-white border-slate-100 text-slate-900 hover:border-slate-300",
                        accent:
                          "bg-indigo-50 text-indigo-600 border border-indigo-100/50",
                        subtext: "Total stages",
                      },
                      {
                        label: "Completed",
                        val: taskMetrics.completed,
                        bg: "bg-emerald-50/35 border-emerald-100/70 text-emerald-950 hover:border-emerald-200",
                        accent:
                          "bg-emerald-100/60 text-emerald-700 border border-emerald-200/50",
                        subtext: "Successfully verified",
                      },
                      {
                        label: "On Time",
                        val: taskMetrics.onTime,
                        bg: "bg-teal-50/20 border-teal-100/60 text-teal-950 hover:border-teal-200",
                        accent:
                          "bg-teal-100/60 text-teal-700 border border-teal-200/50",
                        subtext: "Completed prior to deadline",
                      },
                      {
                        label: "Delayed",
                        val: taskMetrics.delayed,
                        bg: "bg-rose-50/30 border-rose-100 text-rose-950 hover:border-rose-200",
                        accent:
                          "bg-rose-100/60 text-rose-700 border border-rose-200/50",
                        subtext: "Urgent action required",
                        shake: taskMetrics.delayed > 0,
                      },
                      {
                        label: "Bypassed",
                        val: taskMetrics.bypassed,
                        bg: "bg-slate-50/60 border-slate-200/60 text-slate-800 hover:border-slate-300",
                        accent:
                          "bg-slate-100 text-slate-600 border border-slate-250/20",
                        subtext: "Force-approved or excluded",
                      },
                    ].map((m, idx) => (
                      <motion.div
                        whileHover={{ y: -2, scale: 1.01 }}
                        key={idx}
                        className={`border p-4.5 rounded-2xl bg-white ${m.bg} flex flex-col justify-between shadow-sm transition-all duration-300 relative overflow-hidden group ${m.shake ? "ring-2 ring-rose-300 animate-pulse" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                            {m.label}
                          </span>
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${m.accent}`}
                          >
                            {m.label[0]}
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl font-black text-slate-900 tracking-tight block leading-none mb-1">
                            {m.val}
                          </span>
                          <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide leading-none">
                            {m.subtext}
                          </span>
                        </div>
                        {/* Tiny decorative bar at bottom */}
                        <div className="absolute bottom-0 inset-x-0 h-[3px] bg-slate-150 group-hover:bg-indigo-500/45 transition-colors" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Execution Roadmap Task Sheet */}
                {/* Desktop-only Table View */}
                <div className="hidden lg:block overflow-x-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-20 animate-fade-in">
                  <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[260px]">
                          Phase & Activity
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[110px]">
                          Requirement
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center w-[120px]">
                          Assignment Button
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[200px]">
                          Steward Assigned
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[160px]">
                          Assigned Date
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[140px]">
                          Completed Date
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[130px]">
                          Delay / On-Time
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-[220px]">
                          Directive Remark
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          id: 14,
                          label: "New Connection",
                          emailField: "s_newConn_assignedToEmail",
                          nameField: "s_newConn_assignedTo",
                          icon: PlusCircle,
                          condition: lead.newConnectionRequired === "Yes",
                          desc: "New Connection Details",
                          requiredField: "newConnectionRequired",
                        },
                        {
                          id: 1,
                          label: "Doc Correction",
                          emailField: "s_docCorr_assignedToEmail",
                          nameField: "s_docCorr_assignedTo",
                          icon: FileCheck,
                          condition: lead.s_docCorr_required === "Yes",
                          desc: "Document Audit",
                          requiredField: "s_docCorr_required",
                        },
                        {
                          id: 2,
                          label: "Load Extension",
                          emailField: "s_loadExt_assignedToEmail",
                          nameField: "s_loadExt_assignedTo",
                          icon: Zap,
                          condition: lead.loadExtensionRequired === "Yes",
                          desc: "Load Protocol",
                          requiredField: "loadExtensionRequired",
                        },
                        {
                          id: 3,
                          label: "Online Registration",
                          emailField: "execution_assignedToEmail",
                          nameField: "execution_assignedTo",
                          icon: ExternalLink,
                          desc: "Onboarding",
                        },
                        {
                          id: 4,
                          label: "Loan Processing",
                          emailField: "s4_loanAssignedToEmail",
                          nameField: "s4_loanAssignedTo",
                          icon: CreditCard,
                          condition: lead.loanRequired === "Yes",
                          desc: "Financial Sync",
                          requiredField: "loanRequired",
                        },
                        {
                          id: 5,
                          label: "Meter Dispatch",
                          emailField: "s5_storeDispatchAssignedToEmail",
                          nameField: "s5_storeDispatchAssignedTo",
                          icon: HardDrive,
                          desc: "Logistics",
                        },
                        {
                          id: 6,
                          label: "DISCOM (Pre-Install)",
                          emailField: "s5_discomPreAssignedToEmail",
                          nameField: "s5_discomPreAssignedTo",
                          icon: Zap,
                          desc: "Utility Sync",
                        },
                        {
                          id: 7,
                          label: "SITE INCHARGE",
                          emailField: "s6_inchargeAssignedToEmail",
                          nameField: "s6_inchargeAssignedTo",
                          icon: MapPin,
                          desc: "Field Control",
                        },
                        {
                          id: 8,
                          label: "STORE INCHARGE",
                          emailField: "s5_storeInchargeAssignedToEmail",
                          nameField: "s5_storeInchargeAssignedTo",
                          icon: HardDrive,
                          desc: "Custodian",
                        },
                        {
                          id: 9,
                          label: "SITE TEAM",
                          emailField: "s6_assignedToEmail",
                          nameField: "s6_assignedTo",
                          icon: Users,
                          desc: "Installation",
                        },
                        {
                          id: 10,
                          label: "OFFICE EXEC (Post)",
                          emailField: "s7_assignedToEmail",
                          nameField: "s7_assignedTo",
                          icon: FileCheck,
                          desc: "Post-Install",
                        },
                        {
                          id: 11,
                          label: "DISCOM (Post-Install)",
                          emailField: "s8_assignedToEmail",
                          nameField: "s8_assignedTo",
                          icon: Zap,
                          desc: "Utility Closure",
                        },
                        {
                          id: 12,
                          label: "LOAN OFFICER (Post)",
                          emailField: "s9_assignedToEmail",
                          nameField: "s9_assignedTo",
                          icon: CreditCard,
                          condition: lead.loanRequired === "Yes",
                          desc: "Final Audit",
                          requiredField: "loanRequired",
                        },
                        {
                          id: 13,
                          label: "SUBSIDY SECTION",
                          emailField: "s11_assignedToEmail",
                          nameField: "s11_assignedTo",
                          icon: FileText,
                          desc: "Incentives",
                        },
                        {
                          id: 15,
                          label: "INSURANCE SECTION",
                          emailField: "s12_assignedToEmail",
                          nameField: "s12_assignedTo",
                          icon: Shield,
                          desc: "Insurance",
                        },
                      ]
                        .filter((step) => step.condition !== false)
                        .map((step, index) => {
                          const isCompleted = (lead as any)[
                            `isStep${step.id}Submitted`
                          ];
                          const assigneeName =
                            (lead as any)[step.nameField] || "";
                          const isRequired = step.requiredField
                            ? (lead as any)[step.requiredField]
                            : "Yes";
                          const dueDateValue =
                            lead.stepDueDates?.[step.id] || "";
                          const remarkValue =
                            (lead as any)[`step${step.id}Remark`] || "";

                          const status =
                            isRequired === "No"
                              ? "Bypassed"
                              : isCompleted
                                ? "Completed"
                                : assigneeName
                                  ? "Assigned"
                                  : "Unassigned";

                          let rowBg = "hover:bg-slate-50/40";
                          let rowBorderLeft = "border-l-4 border-l-transparent";

                          if (status === "Bypassed") {
                            rowBg =
                              "bg-slate-50/20 opacity-70 hover:bg-slate-50/30";
                            rowBorderLeft = "border-l-4 border-l-slate-200";
                          }

                          // Parse completed & due dates
                          const completedDateStr =
                            lead.stepCompletionDates?.[step.id];
                          const completedDateObj = completedDateStr
                            ? new Date(completedDateStr)
                            : null;
                          const dueDateObj = dueDateValue
                            ? new Date(dueDateValue)
                            : null;

                          // Compute Delay / On-Time
                          let timelineStatus: string = "On Time";
                          let delayDays = 0;

                          if (isRequired === "No") {
                            timelineStatus = "Bypassed";
                          } else if (!assigneeName) {
                            timelineStatus = "Unassigned";
                          } else {
                            timelineStatus = "On Time";
                          }

                          return (
                            <tr
                              key={step.id}
                              className={`group transition-all duration-300 ${rowBg} ${rowBorderLeft} border-b border-slate-100/60 last:border-0`}
                            >
                              {/* Phase & Activity */}
                              <td className="px-5 py-5.5">
                                <div className="flex items-center gap-3.5">
                                  <div
                                    className={`w-8.5 h-8.5 rounded-2xl flex items-center justify-center font-black text-[11px] shadow-sm tracking-tighter ${
                                      status === "Completed"
                                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200"
                                        : status === "Assigned"
                                          ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950"
                                          : status === "Unassigned"
                                            ? "bg-gradient-to-br from-rose-500 to-red-600 text-white animate-pulse"
                                            : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {String(index + 1).padStart(2, "0")}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-900 tracking-tight leading-tight mb-0.5">
                                      {step.label}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                                      {step.desc}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Requirement status */}
                              <td className="px-5 py-5.5">
                                {step.requiredField ? (
                                  <button
                                    onClick={() =>
                                      handleUpdate({
                                        [step.requiredField as string]:
                                          isRequired === "Yes" ? "No" : "Yes",
                                      })
                                    }
                                    disabled={
                                      isCompleted ||
                                      (!isAdminUser && !isSteward)
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                                      isRequired === "Yes"
                                        ? "bg-emerald-50/50 text-emerald-700 border-emerald-200/60 shadow-xs"
                                        : "bg-rose-50/50 text-rose-700 border-rose-200/60 shadow-xs"
                                    }`}
                                    title="Toggle Requirement"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                    {isRequired === "Yes"
                                      ? "Required"
                                      : "Bypassed"}
                                  </button>
                                ) : (
                                  <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50/50 text-indigo-700 border border-indigo-200/40 shadow-xs">
                                    Mandatory
                                  </span>
                                )}
                              </td>

                              {/* Protocol Action buttons (Moved after Requirement) */}
                              <td className="px-5 py-5.5">
                                <div className="flex justify-center items-center gap-2">
                                  {isCompleted ? (
                                    <motion.button
                                      disabled
                                      className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-600/15 flex items-center justify-center gap-1.5 transition-all border border-emerald-500/30"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{" "}
                                      Done
                                    </motion.button>
                                  ) : isRequired === "Yes" ? (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => {
                                        setActiveAssignStep({
                                          id: step.id,
                                          label: step.label,
                                          nameField: step.nameField,
                                          emailField: step.emailField || "",
                                          currentAssigneeName: assigneeName,
                                          currentDueDate: dueDateValue,
                                          currentRemark: remarkValue,
                                        });
                                        setAssignSelectedUser(assigneeName);
                                        setAssignDueDate(dueDateValue);
                                        setAssignRemarkText(remarkValue);
                                      }}
                                      disabled={
                                        !canEditTab("project_incharge") ||
                                        !canUserAssignTasks
                                      }
                                      className={`px-3.5 py-1.5 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-20 flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                                        assigneeName
                                          ? "bg-amber-500 hover:bg-amber-600 border-amber-400/30 shadow-amber-500/15"
                                          : "bg-indigo-600 hover:bg-indigo-700 border-indigo-500/30 shadow-indigo-600/15"
                                      }`}
                                      title="Set Deadlines and Remarks for this phase"
                                    >
                                      <Calendar className="w-3.5 h-3.5 shrink-0" />{" "}
                                      {assigneeName ? "Assigned" : "Assign"}
                                    </motion.button>
                                  ) : (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => {
                                        handleUpdate({
                                          [`isStep${step.id}Submitted`]: true,
                                          [`step${step.id}Status`]: "Bypassed",
                                          [`step${step.id}Remark`]:
                                            "Marked as Not Required by In-charge",
                                          updatedAt: new Date(),
                                        });
                                        showNotification(
                                          `Bypassed phase: ${step.label}`,
                                          "warning",
                                        );
                                      }}
                                      disabled={
                                        isCompleted ||
                                        !canEditTab("project_incharge") ||
                                        !canUserAssignTasks
                                      }
                                      className="w-8.5 h-8.5 bg-slate-50 text-slate-500 rounded-2xl hover:bg-emerald-600 hover:text-white border border-slate-200/50 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                                      title="Bypass Protocol"
                                    >
                                      <FileCheck className="w-4.5 h-4.5" />
                                    </motion.button>
                                  )}
                                </div>
                              </td>

                              {/* Steward assigned */}
                              <td className="px-5 py-5.5">
                                {isRequired === "Yes" ? (
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border border-slate-100/50 ${assigneeName ? "bg-indigo-50/80 text-indigo-600" : "bg-slate-50 text-slate-400"}`}
                                    >
                                      {step.icon ? (
                                        <step.icon className="w-4 h-4" />
                                      ) : (
                                        <Users className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-black text-slate-800 block leading-tight truncate max-w-[130px]">
                                        {assigneeName || "Unassigned"}
                                      </span>
                                      {assigneeName && (
                                        <span className="text-[9px] text-slate-400 font-bold block truncate max-w-[130px]">
                                          {(lead as any)[
                                            step.emailField || ""
                                          ] || ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400 italic">
                                    Skipped Phase
                                  </span>
                                )}
                              </td>

                              {/* Due Date column */}
                              <td className="px-5 py-5.5">
                                {isRequired === "Yes" ? (
                                  dueDateObj && !isNaN(dueDateObj.getTime()) ? (
                                    <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50/80 border border-slate-200/50 px-2.5 py-1.5 rounded-xl w-fit shadow-xs">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                                        {format(dueDateObj, "dd MMM yyyy")}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black bg-rose-50/60 border border-rose-100/50 text-rose-500 uppercase">
                                      Pending Assign
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-400 italic font-medium">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Completed Date column */}
                              <td className="px-5 py-5.5 font-mono">
                                {isRequired === "Yes" ? (
                                  isCompleted && completedDateObj ? (
                                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/80 border border-emerald-100/50 px-2.5 py-1.5 rounded-xl w-fit shadow-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span className="text-[11px] font-bold uppercase text-emerald-600">
                                        {format(
                                          completedDateObj,
                                          "dd MMM yyyy",
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-300 tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                      PENDING
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-400 italic font-medium">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Delay / On-Time status badge */}
                              <td className="px-5 py-5.5">
                                {timelineStatus === "Bypassed" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black bg-slate-50 border border-slate-200/30 text-slate-450 uppercase">
                                    Bypassed
                                  </span>
                                ) : timelineStatus === "Unassigned" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black bg-rose-50/60 border border-rose-100/40 text-rose-500 uppercase animate-pulse">
                                    Pending Assign
                                  </span>
                                ) : timelineStatus === "Delay" ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100/60 uppercase">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    Delay ({delayDays}d)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    On Time
                                  </span>
                                )}
                              </td>

                              {/* Operational directive remark output */}
                              <td className="px-5 py-5.5">
                                {isRequired === "Yes" ? (
                                  remarkValue ? (
                                    <div
                                      className="text-[11px] font-semibold text-slate-600 max-w-[210px] bg-slate-50/60 border border-slate-100/60 rounded-xl px-2.5 py-1.5 text-left truncate hover:whitespace-normal cursor-help shadow-xs"
                                      title={remarkValue}
                                    >
                                      {remarkValue}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-350 font-medium italic">
                                      No guideline set.
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-400 italic font-medium">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / Tablet Responsive Cards View */}
                <div className="block lg:hidden space-y-4 mb-20 animate-fade-in">
                  {[
                    {
                      id: 14,
                      label: "New Connection",
                      emailField: "s_newConn_assignedToEmail",
                      nameField: "s_newConn_assignedTo",
                      icon: PlusCircle,
                      condition: lead.newConnectionRequired === "Yes",
                      desc: "New Connection Details",
                      requiredField: "newConnectionRequired",
                    },
                    {
                      id: 1,
                      label: "Doc Correction",
                      emailField: "s_docCorr_assignedToEmail",
                      nameField: "s_docCorr_assignedTo",
                      icon: FileCheck,
                      condition: lead.s_docCorr_required === "Yes",
                      desc: "Document Audit",
                      requiredField: "s_docCorr_required",
                    },
                    {
                      id: 2,
                      label: "Load Extension",
                      emailField: "s_loadExt_assignedToEmail",
                      nameField: "s_loadExt_assignedTo",
                      icon: Zap,
                      condition: lead.loadExtensionRequired === "Yes",
                      desc: "Load Protocol",
                      requiredField: "loadExtensionRequired",
                    },
                    {
                      id: 3,
                      label: "Online Registration",
                      emailField: "execution_assignedToEmail",
                      nameField: "execution_assignedTo",
                      icon: ExternalLink,
                      desc: "Onboarding",
                    },
                    {
                      id: 4,
                      label: "Loan Processing",
                      emailField: "s4_loanAssignedToEmail",
                      nameField: "s4_loanAssignedTo",
                      icon: CreditCard,
                      condition: lead.loanRequired === "Yes",
                      desc: "Financial Sync",
                      requiredField: "loanRequired",
                    },
                    {
                      id: 5,
                      label: "Meter Dispatch",
                      emailField: "s5_storeDispatchAssignedToEmail",
                      nameField: "s5_storeDispatchAssignedTo",
                      icon: HardDrive,
                      desc: "Logistics",
                    },
                    {
                      id: 6,
                      label: "DISCOM (Pre-Install)",
                      emailField: "s5_discomPreAssignedToEmail",
                      nameField: "s5_discomPreAssignedTo",
                      icon: Zap,
                      desc: "Utility Sync",
                    },
                    {
                      id: 7,
                      label: "SITE INCHARGE",
                      emailField: "s6_inchargeAssignedToEmail",
                      nameField: "s6_inchargeAssignedTo",
                      icon: MapPin,
                      desc: "Field Control",
                    },
                    {
                      id: 8,
                      label: "STORE INCHARGE",
                      emailField: "s5_storeInchargeAssignedToEmail",
                      nameField: "s5_storeInchargeAssignedTo",
                      icon: HardDrive,
                      desc: "Custodian",
                    },
                    {
                      id: 9,
                      label: "SITE TEAM",
                      emailField: "s6_assignedToEmail",
                      nameField: "s6_assignedTo",
                      icon: Users,
                      desc: "Installation",
                    },
                    {
                      id: 10,
                      label: "OFFICE EXEC (Post)",
                      emailField: "s7_assignedToEmail",
                      nameField: "s7_assignedTo",
                      icon: FileCheck,
                      desc: "Post-Install",
                    },
                    {
                      id: 11,
                      label: "DISCOM (Post-Install)",
                      emailField: "s8_assignedToEmail",
                      nameField: "s8_assignedTo",
                      icon: Zap,
                      desc: "Utility Closure",
                    },
                    {
                      id: 12,
                      label: "LOAN OFFICER (Post)",
                      emailField: "s9_assignedToEmail",
                      nameField: "s9_assignedTo",
                      icon: CreditCard,
                      condition: lead.loanRequired === "Yes",
                      desc: "Final Audit",
                      requiredField: "loanRequired",
                    },
                    {
                      id: 13,
                      label: "SUBSIDY SECTION",
                      emailField: "s11_assignedToEmail",
                      nameField: "s11_assignedTo",
                      icon: FileText,
                      desc: "Incentives",
                    },
                    {
                      id: 15,
                      label: "INSURANCE SECTION",
                      emailField: "s12_assignedToEmail",
                      nameField: "s12_assignedTo",
                      icon: Shield,
                      desc: "Insurance",
                    },
                  ]
                    .filter((step) => step.condition !== false)
                    .map((step, index) => {
                      const isCompleted = (lead as any)[
                        `isStep${step.id}Submitted`
                      ];
                      const assigneeName = (lead as any)[step.nameField] || "";
                      const isRequired = step.requiredField
                        ? (lead as any)[step.requiredField]
                        : "Yes";
                      const dueDateValue = lead.stepDueDates?.[step.id] || "";
                      const remarkValue =
                        (lead as any)[`step${step.id}Remark`] || "";

                      const status =
                        isRequired === "No"
                          ? "Bypassed"
                          : isCompleted
                            ? "Completed"
                            : assigneeName
                              ? "Assigned"
                              : "Unassigned";

                      // Delay / timeline status logic
                      const completedDateStr =
                        lead.stepCompletionDates?.[step.id];
                      const completedDateObj = completedDateStr
                        ? new Date(completedDateStr)
                        : null;
                      const dueDateObj = dueDateValue
                        ? new Date(dueDateValue)
                        : null;

                      let timelineStatus: string = "On Time";
                      let delayDays = 0;

                      if (isRequired === "No") {
                        timelineStatus = "Bypassed";
                      } else if (!assigneeName) {
                        timelineStatus = "Unassigned";
                      } else {
                        timelineStatus = "On Time";
                      }

                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-white rounded-[2rem] border ${isRequired === "No" ? "border-slate-100 bg-slate-50/50 opacity-70" : "border-slate-150"} shadow-md p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg`}
                        >
                          {/* Header bar */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                                  status === "Completed"
                                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-100"
                                    : status === "Assigned"
                                      ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950"
                                      : status === "Unassigned"
                                        ? "bg-gradient-to-br from-rose-500 to-red-600 text-white animate-pulse"
                                        : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {String(index + 1).padStart(2, "0")}
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900 leading-tight block">
                                  {step.label}
                                </h4>
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                                  {step.desc}
                                </span>
                              </div>
                            </div>

                            {/* Requirement badge/button */}
                            {step.requiredField ? (
                              <button
                                onClick={() =>
                                  handleUpdate({
                                    [step.requiredField as string]:
                                      isRequired === "Yes" ? "No" : "Yes",
                                  })
                                }
                                disabled={
                                  isCompleted || (!isAdminUser && !isSteward)
                                }
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                                  isRequired === "Yes"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs"
                                    : "bg-rose-50 text-rose-700 border-rose-100/80 shadow-xs"
                                }`}
                              >
                                {isRequired === "Yes" ? "Required" : "Bypassed"}
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs">
                                Mandatory
                              </span>
                            )}
                          </div>

                          {isRequired === "Yes" && (
                            <div className="grid grid-cols-2 gap-3.5 pt-3.5 border-t border-slate-100">
                              {/* Steward assigned */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                                  Steward Assigned
                                </span>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100/70 rounded-xl p-2 md:p-2.5 min-w-0">
                                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[11px] font-bold text-slate-700 truncate block min-w-0 max-w-full">
                                    {assigneeName || "Unassigned"}
                                  </span>
                                </div>
                              </div>

                              {/* Due Date block */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                                  Assigned Date
                                </span>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100/70 rounded-xl p-2 md:p-2.5 min-w-0">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[11px] font-bold text-slate-700 truncate block min-w-0 max-w-full">
                                    {dueDateObj && !isNaN(dueDateObj.getTime())
                                      ? format(dueDateObj, "dd MMM yyyy")
                                      : "Pending"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Deadline and Remark card details */}
                          {isRequired === "Yes" && (
                            <div className="space-y-2 bg-slate-50 rounded-2xl p-3 border border-slate-105/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="shrink-0">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                  Timeline State
                                </span>
                                {timelineStatus === "Delay" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-rose-100 text-rose-700 uppercase">
                                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />{" "}
                                    Delay ({delayDays}d)
                                  </span>
                                ) : timelineStatus === "Unassigned" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-rose-50 text-rose-500 uppercase">
                                    Pending Assign
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-700 uppercase">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{" "}
                                    On Time
                                  </span>
                                )}
                              </div>

                              <div className="sm:max-w-[65%] min-w-0">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                                  Directive Remark
                                </span>
                                <p
                                  className="text-[11px] font-semibold text-slate-600 leading-tight italic truncate max-w-full"
                                  title={remarkValue}
                                >
                                  {remarkValue || "No instructions set."}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Actions footer wrapper */}
                          <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-slate-100 mt-0.5">
                            <div className="min-w-0">
                              {isCompleted && completedDateObj && (
                                <div className="text-[10px] font-black text-slate-450 flex items-center gap-1.5 truncate">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{" "}
                                  Completed on{" "}
                                  {format(completedDateObj, "dd MMM yyyy")}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isCompleted ? (
                                <motion.button
                                  disabled
                                  className="px-3.5 py-2 bg-emerald-600 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-emerald-600/10"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{" "}
                                  Done
                                </motion.button>
                              ) : isRequired === "Yes" ? (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setActiveAssignStep({
                                      id: step.id,
                                      label: step.label,
                                      nameField: step.nameField,
                                      emailField: step.emailField || "",
                                      currentAssigneeName: assigneeName,
                                      currentDueDate: dueDateValue,
                                      currentRemark: remarkValue,
                                    });
                                    setAssignSelectedUser(assigneeName);
                                    setAssignDueDate(dueDateValue);
                                    setAssignRemarkText(remarkValue);
                                  }}
                                  disabled={
                                    !canEditTab("project_incharge") ||
                                    !canUserAssignTasks
                                  }
                                  className={`px-3.5 py-2 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                    assigneeName
                                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
                                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10"
                                  }`}
                                >
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />{" "}
                                  {assigneeName ? "Assigned" : "Assign"}
                                </motion.button>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleUpdate({
                                      [`isStep${step.id}Submitted`]: true,
                                      [`step${step.id}Status`]: "Bypassed",
                                      [`step${step.id}Remark`]:
                                        "Marked as Not Required by In-charge",
                                      updatedAt: new Date(),
                                    });
                                    showNotification(
                                      `Bypassed phase: ${step.label}`,
                                      "warning",
                                    );
                                  }}
                                  disabled={
                                    !canEditTab("project_incharge") ||
                                    !canUserAssignTasks
                                  }
                                  className="px-3 py-1.5 bg-slate-100 disabled:opacity-20 disabled:pointer-events-none text-slate-650 font-black text-[10px] uppercase tracking-wide rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <FileCheck className="w-3.5 h-3.5 shrink-0" />{" "}
                                  Force Complete
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                {/* Custom Assign Step Modal Overlay */}
                <AnimatePresence>
                  {activeAssignStep && (
                    <div
                      id="assign-remark-overlay"
                      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 15 }}
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 350,
                        }}
                        className="bg-white rounded-[2rem] w-full max-w-lg p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 relative overflow-y-auto max-h-[90vh]"
                      >
                        {/* Header decorative accent */}
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600" />

                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                              <Calendar className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">
                                Set Due Date & Guidelines
                              </h4>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                {activeAssignStep.label}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveAssignStep(null)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          {/* Assigned Steward / Specialist Selector */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                              Assigned Steward / Specialist
                            </label>
                            <div className="relative">
                              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              <select
                                value={assignSelectedUser}
                                onChange={(e) =>
                                  setAssignSelectedUser(e.target.value)
                                }
                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all cursor-pointer appearance-none shadow-sm"
                              >
                                <option value="">
                                  Select Steward (Unassigned)
                                </option>
                                {users.map((u, idx) => (
                                  <option
                                    key={`${u.email}-${idx}`}
                                    value={u.name}
                                  >
                                    {u.name} ({u.category || "Staff"})
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          {/* Due Date field (Renamed to Assine Date and locked to today's date) */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                              Assine Date
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              <input
                                type="date"
                                value={new Date().toLocaleDateString("en-CA")}
                                readOnly
                                disabled
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none select-none pointer-events-none shadow-sm"
                              />
                            </div>
                          </div>

                          {/* Remark text field */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                              Instructional Directive / Remark Note
                            </label>
                            <textarea
                              rows={3}
                              value={assignRemarkText}
                              onChange={(e) =>
                                setAssignRemarkText(e.target.value)
                              }
                              placeholder="Provide specific guidelines, operational parameters, or required handovers for this steward..."
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all resize-none shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-55">
                          <button
                            onClick={() => setActiveAssignStep(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleTaskSheetAssignment}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-indigo-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Guidelines
                          </motion.button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Assign to Admin Protocol */}
                <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 md:p-8 mt-12 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-[40px]" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-xl">
                      <h4 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="w-2.5 h-5 rounded bg-indigo-600 block"></span>
                        Admin Assignment Protocol
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        Once all Project Control tasks are submitted, the Project Coordinator must assign the project to the Admin to initiate the Review & Settlement stage.
                      </p>
                    </div>

                    {!lead.isHandoverSubmitted ? (
                      <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                        <div className="w-full sm:w-64">
                          <select
                            value={selectedHandoverAdmin}
                            onChange={(e) => setSelectedHandoverAdmin(e.target.value)}
                            disabled={!isExecutionFlowFinished}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="">-- Choose Admin --</option>
                            {users
                              .filter((u) => u.role === "Admin" || (u as any).category === "Admin")
                              .map((u) => (
                                <option key={u.email} value={u.email}>
                                  {u.name} ({u.email})
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            if (!isExecutionFlowFinished) {
                              showNotification("Please complete all Project Control tasks before assigning to Admin.", "warning");
                              return;
                            }
                            if (!selectedHandoverAdmin) {
                              showNotification("Please select an Admin user to assign.", "warning");
                              return;
                            }
                            const selectedUserObj = users.find((u) => u.email === selectedHandoverAdmin);
                            handleUpdate({
                              handoverAssignedAdminEmail: selectedHandoverAdmin,
                              handoverAssignedAdminName: selectedUserObj?.name || selectedHandoverAdmin,
                              isHandoverSubmitted: true,
                            }, false);
                            setNotification({
                              type: "success",
                              message: "Project successfully assigned and handed over to Admin.",
                            });
                          }}
                          disabled={!isExecutionFlowFinished || !selectedHandoverAdmin}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Assign to Admin
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Project Assigned to Admin: {lead.handoverAssignedAdminName} ({lead.handoverAssignedAdminEmail})</span>
                      </div>
                    )}
                  </div>
                  {!isExecutionFlowFinished && !lead.isHandoverSubmitted && (
                    <p className="text-[10px] text-rose-500 font-extrabold mt-3 bg-rose-50/50 border border-rose-100/50 rounded-xl p-3 inline-block">
                      ⚠️ Awaiting completion of all Project Control tasks to unlock Admin Assignment.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "execution" && (
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Execution Steps Sidebar */}
                <div className="w-full lg:w-64 shrink-0 bg-white border border-slate-100 rounded-3xl p-4 shadow-xl shadow-slate-200/40 lg:sticky top-6 z-10 overflow-x-auto lg:overflow-visible">
                  <div className="mb-4 pb-4 border-b border-slate-100 flex items-center justify-between min-w-max pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">
                          Operational Lifecycle
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar">
                    {[
                      {
                        id: 14,
                        label: "New Connection",
                        condition: lead.newConnectionRequired === "Yes",
                      },
                      {
                        id: 1,
                        label: "Doc Correction",
                        condition: lead.s_docCorr_required === "Yes",
                      },
                      {
                        id: 2,
                        label: "Load Extension",
                        condition: lead.loadExtensionRequired === "Yes",
                      },
                      { id: 3, label: "Online Registration" },
                      {
                        id: 4,
                        label: "Loan Processing",
                        condition: lead.loanRequired === "Yes",
                      },
                      { id: 5, label: "Meter Dispatch" },
                      { id: 6, label: "DISCOM (Pre-Install)" },
                      { id: 7, label: "SITE INCHARGE" },
                      { id: 8, label: "STORE INCHARGE" },
                      { id: 9, label: "SITE TEAM" },
                      { id: 10, label: "OFFICE EXEC (Post-Install)" },
                      { id: 11, label: "DISCOM (Post-Install)" },
                      {
                        id: 12,
                        label: "LOAN OFFICER (Post-Install)",
                        condition: lead.loanRequired === "Yes",
                      },
                      { id: 13, label: "SUBSIDY SECTION" },
                      { id: 15, label: "INSURANCE SECTION" },
                    ]
                      .filter((step) => step.condition !== false)
                      .map((step, index) => {
                        const isCompleted = (lead as any)[
                          `isStep${step.id}Submitted`
                        ];
                        const isActive = currentExecutionStep === step.id;
                        const isActionAssigned = shouldHighlightStep(step.id);

                        return (
                          <button
                            key={step.id}
                            onClick={() => setCurrentExecutionStep(step.id)}
                            className={`flex lg:w-full items-center gap-2 p-2.5 rounded-xl transition-all border text-left group relative shrink-0 ${
                              isActive
                                ? "bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg"
                                : isCompleted
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50"
                                  : "bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-[9px] transition-colors ${
                                isActive
                                  ? "bg-white/20"
                                  : isCompleted
                                    ? "bg-emerald-100"
                                    : "bg-slate-100 group-hover:bg-slate-200"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div className="min-w-0 pr-4">
                              <p className="text-[11px] font-bold truncate leading-tight">
                                {step.label}
                              </p>
                            </div>

                            {isActive && (
                              <motion.div
                                layoutId="activeStepIndicator"
                                className="absolute -left-1 w-1.5 h-6 bg-blue-500 rounded-full hidden lg:block"
                              />
                            )}

                            {isActionAssigned && !isCompleted && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Execution Workspace */}
                <div className="flex-1 min-w-0">
                  <div className="space-y-4">
                    {currentExecutionStep === 1 &&
                      lead.s_docCorr_required === "Yes" && (
                        <motion.div
                          id="execution-step-1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2rem] border-l-4 md:border-l-8 border-l-emerald-600 transition-all duration-700 ${shouldHighlightStep(1) ? "bg-emerald-50/20 ring-2 md:ring-4 ring-emerald-100" : "bg-white shadow-xl border border-slate-100"}`}
                        >
                          <div className="col-span-full pb-3 border-b border-slate-100 mb-2 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                Step 2: Doc Correction
                              </h3>
                              <p className="text-[11px] text-slate-400 font-medium">
                                Verify and correct document discrepancies.
                              </p>
                            </div>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tight">
                              Execution
                            </span>
                          </div>
                          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                              label="Correction Remark"
                              value={lead.docCorrectionRemark}
                              name="docCorrectionRemark"
                              multiline
                              rows={3}
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(1)}
                            />
                            <div
                              className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s_docCorr_docUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                            >
                              {lead.s_docCorr_docUrl ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : uploadingDoc === "Corrected Document" ? (
                                <div className="relative">
                                  <Clock className="w-5 h-5 text-emerald-500 animate-spin" />
                                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded whitespace-nowrap">
                                    {uploadProgress > 0
                                      ? `${Math.round(uploadProgress)}%`
                                      : "Wait..."}
                                  </span>
                                </div>
                              ) : (
                                <Upload className="w-5 h-5 text-slate-400" />
                              )}
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Corrected Document
                              </span>
                              <div className="flex gap-2">
                                <label
                                  htmlFor="input-doc-correction"
                                  className={`text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Corrected Document" || !canEditStep(1) ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                  {lead.s_docCorr_docUrl
                                    ? "Replace"
                                    : "Upload File"}
                                  <input
                                    id="input-doc-correction"
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={(e) =>
                                      handleFileUpload(
                                        e,
                                        "Corrected Document",
                                        "s_docCorr_docUrl",
                                      )
                                    }
                                    disabled={
                                      uploadingDoc === "Corrected Document" ||
                                      !canEditStep(1)
                                    }
                                  />
                                </label>
                                {lead.s_docCorr_docUrl && (
                                  <a
                                    href={lead.s_docCorr_docUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                  >
                                    View{" "}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <StepActionButtons
                            stepId={1}
                            label="Step 2: Doc Correction"
                            nameField="s_docCorr_assignedTo"
                            emailField="s_docCorr_assignedToEmail"
                            hideAssignment
                          />
                        </motion.div>
                      )}

                    {currentExecutionStep === 2 &&
                      lead.loadExtensionRequired === "Yes" && (
                        <motion.div
                          id="execution-step-2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-5 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-orange-600 transition-all duration-700 ${shouldHighlightStep(2) ? "bg-orange-50/20 ring-2 md:ring-4 ring-orange-100" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                        >
                          <div className="col-span-full pb-3 md:pb-4 border-b border-slate-100 mb-2 md:mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                                Step 3: Load Extension
                              </h3>
                              <p className="text-xs md:text-sm text-slate-400 font-medium">
                                Process load extension tracking.
                              </p>
                            </div>
                            <span className="bg-blue-50 text-blue-700 text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-blue-100 uppercase tracking-widest shrink-0">
                              Execution
                            </span>
                          </div>

                          {/* Notice: Actual document upload is in Step 2! */}
                          {lead.loadExtensionRequired === "Yes" && (
                            <>
                              <InputField
                                label="Load Ext File Submitted Date"
                                value={lead.s3_loadExtFileSubmittedDate}
                                name="s3_loadExtFileSubmittedDate"
                                type="date"
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(2)}
                              />
                              <div
                                className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s3_loadExtFileUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                              >
                                {lead.s3_loadExtFileUrl ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : uploadingDoc === "Load Ext File" ? (
                                  <div className="relative">
                                    <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                      {uploadProgress > 0
                                        ? `${Math.round(uploadProgress)}%`
                                        : "Wait..."}
                                    </span>
                                  </div>
                                ) : (
                                  <Upload className="w-5 h-5 text-slate-400" />
                                )}
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Load Ext File Submitted
                                </span>
                                <div className="flex gap-2">
                                  <label
                                    htmlFor="input-s3-load-ext"
                                    className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Load Ext File" || !canEditStep(2) ? "opacity-50 pointer-events-none" : ""}`}
                                  >
                                    {lead.s3_loadExtFileUrl
                                      ? "Replace"
                                      : "Upload File"}
                                    <input
                                      id="input-s3-load-ext"
                                      type="file"
                                      className="hidden"
                                      accept="application/pdf"
                                      onChange={(e) =>
                                        handleFileUpload(
                                          e,
                                          "Load Ext File",
                                          "s3_loadExtFileUrl",
                                        )
                                      }
                                      disabled={
                                        uploadingDoc === "Load Ext File" ||
                                        !canEditStep(2)
                                      }
                                    />
                                  </label>
                                  {lead.s3_loadExtFileUrl && (
                                    <a
                                      href={lead.s3_loadExtFileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                    >
                                      View{" "}
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <InputField
                                label="Demand Note Issued (Date)"
                                value={lead.s3_demandNoteIssued}
                                name="s3_demandNoteIssued"
                                type="date"
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(2)}
                              />
                              <InputField
                                label="Demand Deposited (Date)"
                                value={lead.s3_demandDeposited}
                                name="s3_demandDeposited"
                                type="date"
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(2)}
                              />
                              <InputField
                                label="Remark"
                                value={lead.s3_discomRemark}
                                name="s3_discomRemark"
                                multiline
                                rows={1}
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(2)}
                              />
                            </>
                          )}

                          <StepActionButtons
                            stepId={2}
                            label="Step 3: Load Extension"
                            nameField="execution_assignedTo"
                            emailField="execution_assignedToEmail"
                          />
                        </motion.div>
                      )}

                    {currentExecutionStep === 3 && (
                      <motion.div
                        id="execution-step-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-10 rounded-[3rem] border-l-8 border-l-blue-600 transition-all duration-700 ${shouldHighlightStep(3) ? "bg-blue-50/20 ring-4 ring-blue-100" : "bg-white shadow-2xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(3) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 4: Online Registration
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              DISCOM registration and initial project setup.
                            </p>
                          </div>
                          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wider">
                            Execution
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.execution_assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="All the details are confirmed by customer"
                          value={lead.s3_detailsConfirmedByCustomer}
                          name="s3_detailsConfirmedByCustomer"
                          options={["Yes", "No"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(3)}
                        />
                        <InputField
                          label="AEN Office Name"
                          value={lead.s3_aenOfficeName}
                          name="s3_aenOfficeName"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(3)}
                        />
                        <InputField
                          label="Bank & Branch Name"
                          value={lead.s3_bankName}
                          name="s3_bankName"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(3)}
                        />
                        <InputField
                          label="Online Registration Done (Date)"
                          value={lead.s3_onlineRegistrationDone}
                          name="s3_onlineRegistrationDone"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(3)}
                        />

                        {lead.loanRequired === "Yes" && (
                          <InputField
                            label="Loan Applied (Date)"
                            value={lead.s4_loanApplied}
                            name="s4_loanApplied"
                            type="date"
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(3)}
                          />
                        )}

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s3_loanFileUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s3_loanFileUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Loan File" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Wait..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Loan File Documents
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-s3-loan-file"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Loan File" || !canEditStep(3) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s3_loanFileUrl ? "Replace" : "Upload File"}
                              <input
                                id="input-s3-loan-file"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Loan File",
                                    "s3_loanFileUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Loan File" ||
                                  !canEditStep(3)
                                }
                              />
                            </label>
                            {lead.s3_loanFileUrl && (
                              <a
                                href={lead.s3_loanFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s3_discomFileUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s3_discomFileUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Discom File" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Wait..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Discom File Documents
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-s3-discom-file"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Discom File" || !canEditStep(3) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s3_discomFileUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-s3-discom-file"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Discom File",
                                    "s3_discomFileUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Discom File" ||
                                  !canEditStep(3)
                                }
                              />
                            </label>
                            {lead.s3_discomFileUrl && (
                              <a
                                href={lead.s3_discomFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <StepActionButtons
                          stepId={3}
                          label="Online Registration"
                          nameField="execution_assignedTo"
                          emailField="execution_assignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 4 &&
                      lead.loanRequired === "Yes" && (
                        <motion.div
                          id="execution-step-4"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-purple-600 transition-all duration-700 ${shouldHighlightStep(4) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400 font-medium" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                        >
                          {shouldHighlightStep(4) && (
                            <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] md:text-[10px] font-black uppercase px-3 py-1 md:py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                                <AlertCircle className="w-3 md:w-3.5 h-3 md:h-3.5" />{" "}
                                ACTION ASSIGNED
                              </span>
                            </div>
                          )}
                          <div className="col-span-full pb-3 md:pb-4 border-b border-slate-100 mb-2 md:mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                                Step 5: Loan Process
                              </h3>
                              <p className="text-xs md:text-sm text-slate-400 font-medium">
                                Banking documentation and tracking.
                              </p>
                            </div>
                            <span className="bg-purple-50 text-purple-700 text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-purple-100 uppercase tracking-widest shrink-0">
                              Loan
                            </span>
                          </div>

                          <div className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 mb-2 md:mb-6 col-span-full">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-lg md:rounded-xl flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                              <Users className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Operational Doer
                              </p>
                              <p className="text-xs md:text-sm font-bold text-slate-900 leading-none truncate">
                                {lead.s4_loanAssignedTo || "Unassigned"}
                              </p>
                            </div>
                          </div>

                          <InputField
                            label="Physical File Submited to Bank(Date)"
                            value={lead.s4_physicalFileToBankDate}
                            name="s4_physicalFileToBankDate"
                            type="date"
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(4)}
                          />
                          <InputField
                            label="Loan Process (Date)"
                            value={lead.s4_loanProcessDate}
                            name="s4_loanProcessDate"
                            type="date"
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(4)}
                          />
                          <InputField
                            label="Customer Sign Done (Date)"
                            value={lead.s4_customerSignDate}
                            name="s4_customerSignDate"
                            type="date"
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(4)}
                          />
                          <InputField
                            label="First Installment Received"
                            value={lead.s4_firstInstallmentReceived}
                            name="s4_firstInstallmentReceived"
                            options={["Yes", "No"]}
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(4)}
                          />

                          {lead.s4_firstInstallmentReceived === "Yes" && (
                            <>
                              <InputField
                                label="Amount"
                                value={lead.s4_firstInstallmentAmount}
                                name="s4_firstInstallmentAmount"
                                type="number"
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(4)}
                              />
                              <InputField
                                label="UTR No"
                                value={lead.s4_firstInstallmentUtr}
                                name="s4_firstInstallmentUtr"
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(4)}
                              />
                              <InputField
                                label="Date"
                                value={lead.s4_firstInstallmentDate}
                                name="s4_firstInstallmentDate"
                                type="date"
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(4)}
                              />
                            </>
                          )}
                          <InputField
                            label="Remark"
                            value={lead.s4_loanRemark}
                            name="s4_loanRemark"
                            multiline
                            rows={1}
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(4)}
                          />

                          <InputField
                            label="Confirmation Assignee"
                            value={lead.accAssignee}
                            name="accAssignee"
                            options={confirmationUsers.map((u) => u.name)}
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(4)}
                          />

                          <StepActionButtons
                            stepId={4}
                            label="Loan Process"
                            nameField="s4_loanAssignedTo"
                            emailField="s4_loanAssignedToEmail"
                          />
                        </motion.div>
                      )}

                    {currentExecutionStep === 5 && (
                      <motion.div
                        id="execution-step-5"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-orange-500 transition-all duration-700 ${shouldHighlightStep(5) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(5) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 6: Meter Dispatch
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              Tracking meter allocation and dispatch status.
                            </p>
                          </div>
                          <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-100 uppercase tracking-wider">
                            Store
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s5_storeDispatchAssignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="Meters"
                          value={lead.s5_meters}
                          name="s5_meters"
                          options={["Ready to Dispatch", "Dispatched"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(5)}
                        />
                        <InputField
                          label="Ready to Dispatch Date"
                          value={lead.s5_readyToDispatchDate}
                          name="s5_readyToDispatchDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(5)}
                        />
                        <InputField
                          label="Dispatch Date"
                          value={lead.s5_dispatchDate}
                          name="s5_dispatchDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(5)}
                        />

                        <InputField
                          label="Meter Details with serial numbers"
                          value={lead.s5_meterDetails}
                          name="s5_meterDetails"
                          type="textarea"
                          rows={2}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(5)}
                        />

                        <InputField
                          label="Remark"
                          value={lead.s5_meterDispatchRemark}
                          name="s5_meterDispatchRemark"
                          type="textarea"
                          rows={2}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(5)}
                        />

                        <StepActionButtons
                          stepId={5}
                          label="Step 6: Meter Dispatch"
                          nameField="s5_storeDispatchAssignedTo"
                          emailField="s5_storeDispatchAssignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 6 && (
                      <motion.div
                        id="execution-step-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-sky-500 transition-all duration-700 ${shouldHighlightStep(6) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(6) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 7: DISCOM (Pre-Install)
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              Meter submission and AEN office verification.
                            </p>
                          </div>
                          <span className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-100 uppercase tracking-wider">
                            DISCOM
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s5_discomPreAssignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="File+Meter Submitted to AEN Office (Date)"
                          value={lead.s5_fileMeterToDiscomDate}
                          name="s5_fileMeterToDiscomDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(6)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s5_preInstallPhotoUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s5_preInstallPhotoUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Pre-Install Photo" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-sky-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-sky-600 bg-sky-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            File+Meter Submission Receipt Upload
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-pre-install-photo"
                              className={`text-[10px] text-sky-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Pre-Install Photo" || !canEditStep(6) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s5_preInstallPhotoUrl
                                ? "Replace"
                                : "Upload PDF"}
                              <input
                                id="input-pre-install-photo"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Pre-Install Photo",
                                    "s5_preInstallPhotoUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Pre-Install Photo" ||
                                  !canEditStep(6)
                                }
                              />
                            </label>
                            {lead.s5_preInstallPhotoUrl && (
                              <a
                                href={lead.s5_preInstallPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-sky-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="Meter Tested & Received in AEN Office (Optional)"
                          value={lead.s5_meterTestedReceived}
                          name="s5_meterTestedReceived"
                          type="Date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(6)}
                        />
                        <InputField
                          label="S3 Remarks"
                          value={lead.s3_discomRemark}
                          name="s3_discomRemark"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(6)}
                        />

                        <StepActionButtons
                          stepId={6}
                          label="Step 7: DISCOM (Pre-Install)"
                          nameField="s5_discomPreAssignedTo"
                          emailField="s5_discomPreAssignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 7 && (
                      <motion.div
                        id="execution-step-7"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-emerald-500 transition-all duration-700 ${shouldHighlightStep(7) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(7) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 8: SITE INCHARGE (For Site Measurment & Date)
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              Site revisit, measurement and material planning.
                            </p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
                            Site
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s6_inchargeAssignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="Expected Work Start (Date)"
                          value={lead.s6_expectedStartDate}
                          name="s6_expectedStartDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(7)}
                        />
                        <InputField
                          label="Site Revisit & Measurement (Date)"
                          value={lead.s6_siteRevisitDate}
                          name="s6_siteRevisitDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(7)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s6_materialListUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s6_materialListUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Material List" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Required Material List
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-material-list"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Material List" || !canEditStep(7) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s6_materialListUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-material-list"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Material List",
                                    "s6_materialListUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Material List" ||
                                  !canEditStep(7)
                                }
                              />
                            </label>
                            {lead.s6_materialListUrl && (
                              <a
                                href={lead.s6_materialListUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s6_siteDrawingUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s6_siteDrawingUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Site Drawing" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Site Drawing
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-site-drawing"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Site Drawing" || !canEditStep(7) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s6_siteDrawingUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-site-drawing"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Site Drawing",
                                    "s6_siteDrawingUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Site Drawing" ||
                                  !canEditStep(7)
                                }
                              />
                            </label>
                            {lead.s6_siteDrawingUrl && (
                              <a
                                href={lead.s6_siteDrawingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="S4 Remarks"
                          value={lead.s6_siteTeamRemark}
                          name="s6_siteTeamRemark"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(7)}
                        />

                        <StepActionButtons
                          stepId={7}
                          label="Step 8: SITE INCHARGE (For Site Measurment & Date)"
                          nameField="s6_inchargeAssignedTo"
                          emailField="s6_inchargeAssignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 8 && (
                      <motion.div
                        id="execution-step-8"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-indigo-500 transition-all duration-700 ${shouldHighlightStep(8) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(8) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 9: STORE INCHARGE
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              Material readiness and dispatch tracking.
                            </p>
                          </div>
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
                            Store
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s5_storeInchargeAssignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="Material Ready to Dispatch"
                          value={lead.s5_materialReadyToDispatch}
                          name="s5_materialReadyToDispatch"
                          options={["Ready To Dispatch", "Dispatched"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(8)}
                        />

                        <InputField
                          label="Ready to Dispatch Date"
                          value={lead.s5_materialReadyToDispatchDate}
                          name="s5_materialReadyToDispatchDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(8)}
                        />

                        <InputField
                          label="Dispatch Date"
                          value={lead.s5_storeDispatchDate}
                          name="s5_storeDispatchDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(8)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s5_materialListUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s5_materialListUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Store Material List" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Material List
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-store-material-list"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Store Material List" || !canEditStep(8) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s5_materialListUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-store-material-list"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Store Material List",
                                    "s5_materialListUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Store Material List" ||
                                  !canEditStep(8)
                                }
                              />
                            </label>
                            {lead.s5_materialListUrl && (
                              <a
                                href={lead.s5_materialListUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="S5 Remarks"
                          value={lead.s5_storeRemark}
                          name="s5_storeRemark"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(8)}
                        />

                        <StepActionButtons
                          stepId={8}
                          label="Step 9: STORE INCHARGE"
                          nameField="s5_storeInchargeAssignedTo"
                          emailField="s5_storeInchargeAssignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 9 && (
                      <motion.div
                        id="execution-step-9"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-rose-500 transition-all duration-700 ${shouldHighlightStep(9) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(9) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 10: SITE TEAM
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              Installation tracking and completion reporting.
                            </p>
                          </div>
                          <span className="bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-100 uppercase tracking-wider">
                            Installation
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s6_assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="Material Received (Date)"
                          value={lead.s6_materialReceivedDate}
                          name="s6_materialReceivedDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(9)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s6_receivedMaterialListUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s6_receivedMaterialListUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Received Material List" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Received Material List
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-received-material-list"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Received Material List" || !canEditStep(9) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s6_receivedMaterialListUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-received-material-list"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Received Material List",
                                    "s6_receivedMaterialListUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Received Material List" ||
                                  !canEditStep(9)
                                }
                              />
                            </label>
                            {lead.s6_receivedMaterialListUrl && (
                              <a
                                href={lead.s6_receivedMaterialListUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="Work Start Date"
                          value={lead.s6_workStartDate}
                          name="s6_workStartDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(9)}
                        />

                        <InputField
                          label="Work End Date"
                          value={lead.s6_workEndDate}
                          name="s6_workEndDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(9)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s6_workCompletionReportUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s6_workCompletionReportUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Completion Report" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Work Completion Report
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-completion-report"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Completion Report" || !canEditStep(9) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s6_workCompletionReportUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-completion-report"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Completion Report",
                                    "s6_workCompletionReportUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Completion Report" ||
                                  !canEditStep(9)
                                }
                              />
                            </label>
                            {lead.s6_workCompletionReportUrl && (
                              <a
                                href={lead.s6_workCompletionReportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="col-span-full mt-4 space-y-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                              Site Deviations
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <InputField
                                label="Any deviation from Final Drawing / Material Requirement Sheet / Work Agreement"
                                value={lead.s6_deviationFromFinal}
                                name="s6_deviationFromFinal"
                                options={["Yes", "No"]}
                                onUpdate={handleUpdate}
                                disabled={!canEditStep(9)}
                              />
                            </div>
                            {lead.s6_deviationFromFinal === "Yes" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <InputField
                                  label="Details"
                                  value={lead.s6_deviationDetails}
                                  name="s6_deviationDetails"
                                  type="textarea"
                                  onUpdate={handleUpdate}
                                  disabled={!canEditStep(9)}
                                />
                                <InputField
                                  label="Deviation Cost"
                                  value={lead.s6_deviationCost}
                                  name="s6_deviationCost"
                                  type="number"
                                  onUpdate={handleUpdate}
                                  disabled={!canEditStep(9)}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-span-full mt-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                            Project Photos
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                              {
                                label: "Project GPS Photos with Owner",
                                name: "s6_photoGpsUrl",
                              },
                              {
                                label: "Inverter",
                                name: "s6_photoInverterUrl",
                              },
                              {
                                label: "Structure (Before Panel)",
                                name: "s6_photoStructureUrl",
                              },
                              {
                                label: "Foundation",
                                name: "s6_photoFoundationUrl",
                              },
                              {
                                label: "Earthing",
                                name: "s6_photoEarthingUrl",
                              },
                              { label: "Wiring", name: "s6_photoWiringUrl" },
                              {
                                label: "Inverter Sr No",
                                name: "s6_photoInverterSrNoUrl",
                              },
                              {
                                label: "Panel Sr No",
                                name: "s6_photoPanelSrNoUrl",
                              },
                            ].map((photo, i) => {
                              const url = (lead as any)[photo.name];
                              const isUploading = uploadingDoc === photo.label;
                              return (
                                <div
                                  key={i}
                                  className={`p-3 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${url ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                                >
                                  {url ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : isUploading ? (
                                    <div className="relative">
                                      <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                        {uploadProgress > 0
                                          ? `${Math.round(uploadProgress)}%`
                                          : "Sync..."}
                                      </span>
                                    </div>
                                  ) : (
                                    <Upload className="w-4 h-4 text-slate-400" />
                                  )}
                                  <span className="text-[10px] font-bold text-slate-500 text-center leading-tight min-h-[20px]">
                                    {photo.label}
                                  </span>
                                  <div className="flex gap-2">
                                    <label
                                      htmlFor={`input-photo-${photo.label.replace(/\s+/g, "-").toLowerCase()}`}
                                      className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${isUploading || !canEditStep(9) ? "opacity-50 pointer-events-none" : ""}`}
                                    >
                                      {url ? "Edit" : "Add"}
                                      <input
                                        id={`input-photo-${photo.label.replace(/\s+/g, "-").toLowerCase()}`}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={(e) =>
                                          handleFileUpload(
                                            e,
                                            photo.label,
                                            photo.name as any,
                                          )
                                        }
                                        disabled={
                                          isUploading || !canEditStep(9)
                                        }
                                      />
                                    </label>
                                    {url && (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                      >
                                        View{" "}
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <InputField
                          label="Expected End (Auto)"
                          value={lead.s6_expectedEndDate}
                          name="s6_expectedEndDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(9)}
                        />

                        <InputField
                          label="S6 Remarks / Delay Reason"
                          value={lead.s6_remarks}
                          name="s6_remarks"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(9)}
                        />

                        <StepActionButtons
                          stepId={9}
                          label="Step 10: SITE TEAM"
                          nameField="s6_assignedTo"
                          emailField="s6_assignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 10 && (
                      <motion.div
                        id="execution-step-10"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-cyan-500 transition-all duration-700 ${shouldHighlightStep(10) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(10) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 11: OFFICE EXEC (Post-Install)
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">
                              Post-installation online submission and tracking.
                            </p>
                          </div>
                          <span className="bg-cyan-50 text-cyan-700 text-xs font-bold px-3 py-1 rounded-full border border-cyan-100 uppercase tracking-wider">
                            Office
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s7_assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="Installation Details submitted Online (Date)"
                          value={lead.s7_onlineSubmissionDate}
                          name="s7_onlineSubmissionDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(10)}
                        />
                        <InputField
                          label="On Time / Delay"
                          value={lead.s7_installationStatus as any}
                          name="s7_installationStatus"
                          options={["On Time", "Delay"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(10)}
                        />

                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div
                            className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s7_dcrCertificateUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                          >
                            {lead.s7_dcrCertificateUrl ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : uploadingDoc === "DCR Certificate" ? (
                              <div className="relative">
                                <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                  {uploadProgress > 0
                                    ? `${Math.round(uploadProgress)}%`
                                    : "Sync..."}
                                </span>
                              </div>
                            ) : (
                              <Upload className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              DCR Certificate
                            </span>
                            <div className="flex gap-2">
                              <label
                                htmlFor="input-dcr-cert"
                                className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "DCR Certificate" || !canEditStep(10) ? "opacity-50 pointer-events-none" : ""}`}
                              >
                                {lead.s7_dcrCertificateUrl
                                  ? "Replace"
                                  : "Upload File"}
                                <input
                                  id="input-dcr-cert"
                                  type="file"
                                  className="hidden"
                                  accept="application/pdf"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      "DCR Certificate",
                                      "s7_dcrCertificateUrl",
                                    )
                                  }
                                  disabled={
                                    uploadingDoc === "DCR Certificate" ||
                                    !canEditStep(10)
                                  }
                                />
                              </label>
                              {lead.s7_dcrCertificateUrl && (
                                <a
                                  href={lead.s7_dcrCertificateUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div
                            className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s7_workCompletionCertificateUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                          >
                            {lead.s7_workCompletionCertificateUrl ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : uploadingDoc ===
                              "Work Completion Certificate" ? (
                              <div className="relative">
                                <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                  {uploadProgress > 0
                                    ? `${Math.round(uploadProgress)}%`
                                    : "Sync..."}
                                </span>
                              </div>
                            ) : (
                              <Upload className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-tight">
                              Work Completion Certificate
                            </span>
                            <div className="flex gap-2">
                              <label
                                htmlFor="input-work-completion-cert"
                                className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Work Completion Certificate" || !canEditStep(10) ? "opacity-50 pointer-events-none" : ""}`}
                              >
                                {lead.s7_workCompletionCertificateUrl
                                  ? "Replace"
                                  : "Upload File"}
                                <input
                                  id="input-work-completion-cert"
                                  type="file"
                                  className="hidden"
                                  accept="application/pdf"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      "Work Completion Certificate",
                                      "s7_workCompletionCertificateUrl",
                                    )
                                  }
                                  disabled={
                                    uploadingDoc ===
                                      "Work Completion Certificate" ||
                                    !canEditStep(10)
                                  }
                                />
                              </label>
                              {lead.s7_workCompletionCertificateUrl && (
                                <a
                                  href={lead.s7_workCompletionCertificateUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div
                            className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s7_invoiceAdvanceReceiptUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                          >
                            {lead.s7_invoiceAdvanceReceiptUrl ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : uploadingDoc === "Invoice+Advance Receipt" ? (
                              <div className="relative">
                                <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                  {uploadProgress > 0
                                    ? `${Math.round(uploadProgress)}%`
                                    : "Sync..."}
                                </span>
                              </div>
                            ) : (
                              <Upload className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-tight">
                              Invoice+Advance Receipt
                            </span>
                            <div className="flex gap-2">
                              <label
                                htmlFor="input-invoice-receipt"
                                className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Invoice+Advance Receipt" || !canEditStep(10) ? "opacity-50 pointer-events-none" : ""}`}
                              >
                                {lead.s7_invoiceAdvanceReceiptUrl
                                  ? "Replace"
                                  : "Upload File"}
                                <input
                                  id="input-invoice-receipt"
                                  type="file"
                                  className="hidden"
                                  accept="application/pdf"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      "Invoice+Advance Receipt",
                                      "s7_invoiceAdvanceReceiptUrl",
                                    )
                                  }
                                  disabled={
                                    uploadingDoc ===
                                      "Invoice+Advance Receipt" ||
                                    !canEditStep(10)
                                  }
                                />
                              </label>
                              {lead.s7_invoiceAdvanceReceiptUrl && (
                                <a
                                  href={lead.s7_invoiceAdvanceReceiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <InputField
                          label="S7 Remarks"
                          value={lead.s7_officeRemark}
                          name="s7_officeRemark"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(10)}
                        />

                        <StepActionButtons
                          stepId={10}
                          label="Step 11: OFFICE EXEC (Post-Install)"
                          nameField="s7_assignedTo"
                          emailField="s7_assignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 11 && (
                      <motion.div
                        id="execution-step-11"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-amber-500 transition-all duration-700 ${shouldHighlightStep(11) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(11) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 12: DISCOM (Post-Install)
                            </h3>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">
                              DISCOM inspection, meter installation and site
                              activation.
                            </p>
                          </div>
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wider">
                            DISCOM
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s8_assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="DISCOM Inspection (Date)"
                          value={lead.s8_discomInspectionDate}
                          name="s8_discomInspectionDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(11)}
                        />
                        <InputField
                          label="Meter Installed (Date)"
                          value={lead.s8_meterInstalledDate}
                          name="s8_meterInstalledDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(11)}
                        />

                        <InputField
                          label="Smart Meter converted to Net Meter"
                          value={lead.s8_smartMeterConverted}
                          name="s8_smartMeterConverted"
                          options={["Yes", "No"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(11)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s8_convertedPhotoUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s8_convertedPhotoUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Converted Photo" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-tight min-h-[20px]">
                            Upload Photo
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-converted-photo"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Converted Photo" || !canEditStep(11) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s8_convertedPhotoUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-converted-photo"
                                type="file"
                                className="hidden"
                                accept="image/*,application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Converted Photo",
                                    "s8_convertedPhotoUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Converted Photo" ||
                                  !canEditStep(11)
                                }
                              />
                            </label>
                            {lead.s8_convertedPhotoUrl && (
                              <a
                                href={lead.s8_convertedPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="Site On Date"
                          value={lead.s8_siteOnDate}
                          name="s8_siteOnDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(11)}
                        />

                        <div
                          className={`p-4 border border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center gap-2 ${lead.s8_trainingCertUrl ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                        >
                          {lead.s8_trainingCertUrl ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : uploadingDoc === "Training Certificate" ? (
                            <div className="relative">
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded whitespace-nowrap">
                                {uploadProgress > 0
                                  ? `${Math.round(uploadProgress)}%`
                                  : "Sync..."}
                              </span>
                            </div>
                          ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-tight min-h-[20px]">
                            Training Completion Certificate
                          </span>
                          <div className="flex gap-2">
                            <label
                              htmlFor="input-training-cert"
                              className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Training Certificate" || !canEditStep(11) ? "opacity-50 pointer-events-none" : ""}`}
                            >
                              {lead.s8_trainingCertUrl
                                ? "Replace"
                                : "Upload File"}
                              <input
                                id="input-training-cert"
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  handleFileUpload(
                                    e,
                                    "Training Certificate",
                                    "s8_trainingCertUrl",
                                  )
                                }
                                disabled={
                                  uploadingDoc === "Training Certificate" ||
                                  !canEditStep(11)
                                }
                              />
                            </label>
                            {lead.s8_trainingCertUrl && (
                              <a
                                href={lead.s8_trainingCertUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <InputField
                          label="S8 Remarks"
                          value={lead.s8_discomRemark}
                          name="s8_discomRemark"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(11)}
                        />

                        <StepActionButtons
                          stepId={11}
                          label="DISCOM (Post-Install)"
                          nameField="s8_assignedTo"
                          emailField="s8_assignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 12 && (
                      <motion.div
                        id="execution-step-12"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-emerald-500 transition-all duration-700 ${shouldHighlightStep(12) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(12) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 13: LOAN OFFICER (Post-Install)
                            </h3>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">
                              Tracking the second installment of the loan.
                            </p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
                            Loan
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s9_assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="2nd Installment Received"
                          value={lead.s9_secondInstallmentReceived}
                          name="s9_secondInstallmentReceived"
                          options={["Yes", "No"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(12)}
                        />

                        {lead.s9_secondInstallmentReceived === "Yes" && (
                          <>
                            <InputField
                              label="Amount"
                              value={lead.s9_secondInstallmentAmount}
                              name="s9_secondInstallmentAmount"
                              type="number"
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(12)}
                            />
                            <InputField
                              label="UTR No."
                              value={lead.s9_secondInstallmentUtr}
                              name="s9_secondInstallmentUtr"
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(12)}
                            />
                            <InputField
                              label="Date"
                              value={lead.s9_secondInstallmentDate}
                              name="s9_secondInstallmentDate"
                              type="date"
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(12)}
                            />
                          </>
                        )}

                        <InputField
                          label="S9 Remarks"
                          value={lead.s9_loanRemark}
                          name="s9_loanRemark"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(12)}
                        />

                        <InputField
                          label="Confirmation Assignee"
                          value={lead.accAssignee}
                          name="accAssignee"
                          options={confirmationUsers.map((u) => u.name)}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(12)}
                        />

                        <StepActionButtons
                          stepId={12}
                          label="Step 13: LOAN OFFICER (Post-Install)"
                          nameField="s9_assignedTo"
                          emailField="s9_assignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 13 && (
                      <motion.div
                        id="execution-step-13"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-indigo-500 transition-all duration-700 ${shouldHighlightStep(13) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(13) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Step 1: SUBSIDY SECTION (OFFICE EXEC)
                            </h3>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">
                              Tracking government subsidy application and
                              receipt.
                            </p>
                          </div>
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
                            Subsidy
                          </span>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              Operational Doer
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-none">
                              {lead.s11_assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>

                        <InputField
                          label="Subsidy Applied (Date)"
                          value={lead.s11_subsidyAppliedDate}
                          name="s11_subsidyAppliedDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(13)}
                        />
                        <InputField
                          label="Subsidy Amount (₹)"
                          value={lead.s11_subsidyAmount}
                          name="s11_subsidyAmount"
                          type="number"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(13)}
                        />
                        <InputField
                          label="Subsidy Received (Date)"
                          value={lead.s11_subsidyReceivedDate}
                          name="s11_subsidyReceivedDate"
                          type="date"
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(13)}
                        />
                        <InputField
                          label="S11 Remarks"
                          value={lead.s11_remarks}
                          name="s11_remarks"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(13)}
                        />

                        <StepActionButtons
                          stepId={13}
                          label="Step 1: SUBSIDY SECTION (OFFICE EXEC)"
                          nameField="s11_assignedTo"
                          emailField="s11_assignedToEmail"
                        />
                      </motion.div>
                    )}

                    {currentExecutionStep === 14 &&
                      lead.newConnectionRequired === "Yes" && (
                        <motion.div
                          id="execution-step-14"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-amber-500 transition-all duration-700 ${shouldHighlightStep(14) ? "bg-amber-50/20 ring-2 md:ring-4 ring-amber-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                        >
                          {shouldHighlightStep(14) && (
                            <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-orange-400">
                                <AlertCircle className="w-3.5 h-3.5" /> ACTION
                                ASSIGNED
                              </span>
                            </div>
                          )}
                          <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">
                                Step 1: NEW CONNECTION SETUP
                              </h3>
                              <p className="text-sm text-slate-400 font-medium tracking-tight">
                                Upload new connection photos and enter
                                installation details.
                              </p>
                            </div>
                            <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wider">
                              New Connection
                            </span>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 col-span-full">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Operational Doer
                              </p>
                              <p className="text-sm font-bold text-slate-900 leading-none">
                                {lead.s_newConn_assignedTo || "Unassigned"}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <InputField
                              label="New Connection Applied Date"
                              name="s_newConn_appliedDate"
                              type="date"
                              value={lead.s_newConn_appliedDate}
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(14)}
                            />
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Upload Photos
                              </label>
                              <div
                                className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-all ${lead.s_newConn_uploadPhotosUrl ? "border-emerald-200 bg-emerald-50/40" : "bg-white border-slate-200"}`}
                              >
                                {lead.s_newConn_uploadPhotosUrl ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Upload className="w-4 h-4 text-slate-400" />
                                )}
                                {uploadingDoc ===
                                "Upload Photos (New Connection)" ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 w-8">
                                      {uploadProgress > 0
                                        ? `${Math.round(uploadProgress)}%`
                                        : "Wait..."}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex-1 text-xs truncate font-semibold ${lead.s_newConn_uploadPhotosUrl ? "text-emerald-700" : "text-slate-700"}`}
                                  >
                                    {lead.s_newConn_uploadPhotosUrl
                                      ? "Uploaded"
                                      : "No file"}
                                  </div>
                                )}
                                <label
                                  htmlFor="input-s-newconn-upload-photos"
                                  className={`text-[10px] text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Upload Photos (New Connection)" || !canEditStep(14) ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                  Choose File
                                </label>
                                <input
                                  id="input-s-newconn-upload-photos"
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      "Upload Photos (New Connection)",
                                      "s_newConn_uploadPhotosUrl",
                                    )
                                  }
                                  disabled={
                                    uploadingDoc ===
                                      "Upload Photos (New Connection)" ||
                                    !canEditStep(14)
                                  }
                                />
                                {lead.s_newConn_uploadPhotosUrl && (
                                  <a
                                    href={lead.s_newConn_uploadPhotosUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Photos Column */}
                          <div className="flex flex-col gap-4">
                            {/* Uploadable option */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                New Connection Photos (Project Details)
                              </label>
                              <div
                                className={`flex items-center gap-3 border rounded-2xl px-4 py-3 transition-all ${lead.executionNewConnectionPhotosUrl ? "border-emerald-200 bg-emerald-50" : "bg-slate-50 border-slate-200"}`}
                              >
                                {lead.executionNewConnectionPhotosUrl ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <Camera className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                )}

                                {uploadingDoc ===
                                "Execution New Connection Photos" ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 w-8">
                                      {uploadProgress > 0
                                        ? `${Math.round(uploadProgress)}%`
                                        : "Wait..."}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex-1 text-sm truncate font-semibold ${lead.executionNewConnectionPhotosUrl ? "text-emerald-700" : "text-slate-700"}`}
                                  >
                                    {lead.executionNewConnectionPhotosUrl
                                      ? "Execution Document Uploaded"
                                      : "No file chosen"}
                                  </div>
                                )}

                                <label
                                  htmlFor="input-execution-conn-step-photos"
                                  className={`text-xs text-blue-600 font-bold hover:underline cursor-pointer ${uploadingDoc === "Execution New Connection Photos" || !canEditStep(14) ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                  {lead.executionNewConnectionPhotosUrl
                                    ? "Replace"
                                    : "Upload File"}
                                  <input
                                    id="input-execution-conn-step-photos"
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={(e) =>
                                      handleFileUpload(
                                        e,
                                        "Execution New Connection Photos",
                                        "executionNewConnectionPhotosUrl",
                                      )
                                    }
                                    disabled={
                                      uploadingDoc ===
                                        "Execution New Connection Photos" ||
                                      !canEditStep(14)
                                    }
                                  />
                                </label>
                              </div>
                              {lead.executionNewConnectionPhotosUrl && (
                                <a
                                  href={lead.executionNewConnectionPhotosUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1 ml-1"
                                >
                                  View Additional Photos{" "}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Details Column */}
                          <InputField
                            label="New Connection Details"
                            value={lead.newConnectionDetails}
                            name="newConnectionDetails"
                            multiline
                            rows={3}
                            onUpdate={handleUpdate}
                            disabled={!canEditStep(14)}
                            placeholder="Enter connection code, specific meter configuration or operational logs..."
                          />

                          <div className="col-span-full">
                            <StepActionButtons
                              stepId={14}
                              label="Step 1: NEW CONNECTION SETUP"
                              nameField="s_newConn_assignedTo"
                              emailField="s_newConn_assignedToEmail"
                            />
                          </div>
                        </motion.div>
                      )}

                    {currentExecutionStep === 15 && (
                      <motion.div
                        id="execution-step-15"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-l-4 md:border-l-8 border-l-sky-500 transition-all duration-700 ${shouldHighlightStep(15) ? "bg-sky-50/20 ring-2 md:ring-4 ring-sky-400" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"}`}
                      >
                        {shouldHighlightStep(15) && (
                          <div className="absolute -top-3 left-6 z-10 flex -ml-4">
                            <span className="bg-gradient-to-r from-sky-500 to-blue-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg animate-pulse tracking-widest flex items-center justify-center gap-1.5 border border-sky-400">
                              <AlertCircle className="w-3.5 h-3.5" /> ACTION
                              ASSIGNED
                            </span>
                          </div>
                        )}
                        <div className="col-span-full pb-4 border-b border-slate-100 mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              Insurance Section
                            </h3>
                          </div>
                          <span className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-100 uppercase tracking-wider">
                            Insurance
                          </span>
                        </div>

                        <InputField
                          label="Insurance Status"
                          value={lead.s12_insuranceStatus}
                          name="s12_insuranceStatus"
                          options={["Done", "Pending"]}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(15)}
                        />

                        {lead.s12_insuranceStatus === "Done" && (
                          <>
                            <InputField
                              label="Policy Details"
                              value={lead.s12_policyDetails}
                              name="s12_policyDetails"
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(15)}
                            />
                            <InputField
                              label="Policy Date"
                              value={lead.s12_policyDate}
                              name="s12_policyDate"
                              type="date"
                              onUpdate={handleUpdate}
                              disabled={!canEditStep(15)}
                            />
                          </>
                        )}

                        <InputField
                          label="S12 Remarks"
                          value={lead.s12_remarks}
                          name="s12_remarks"
                          multiline
                          rows={1}
                          onUpdate={handleUpdate}
                          disabled={!canEditStep(15)}
                        />

                        <StepActionButtons
                          stepId={15}
                          label="Insurance"
                          nameField="s12_assignedTo"
                          emailField="s12_assignedToEmail"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "handover" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {/* Header Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl md:rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-950 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[80px] animate-pulse" />
                    <div className="relative z-10 flex-1">
                      <div className="flex items-center gap-3 mb-3 md:mb-4">
                        <div className="h-px w-6 md:w-8 bg-blue-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-blue-400">
                          Admin Review & Settlement
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-display font-bold mb-2 md:mb-3 tracking-tight md:tracking-tighter leading-tight bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
                        Review & Settlement
                      </h3>
                      <p className="text-slate-400 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                        Verify financial records, enter extra discount adjustments, and validate discom & completion checklist metrics.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Stepper */}
                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${lead.isHandoverAdminSubmitted ? "bg-emerald-500 text-white" : "bg-blue-600 text-white animate-pulse"}`}>
                        1
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Review & Settlement</p>
                        <p className="text-[10px] text-slate-400 font-bold">Verify payments, completion, & billing</p>
                      </div>
                    </div>
                    <div className="hidden md:block h-px flex-1 bg-slate-100 mx-4" />
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${lead.isDeliverablesSubmitted ? "bg-emerald-500 text-white" : lead.isHandoverAdminSubmitted ? "bg-blue-600 text-white animate-pulse" : "bg-slate-100 text-slate-400"}`}>
                        2
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Deliverables Stage</p>
                        <p className="text-[10px] text-slate-400 font-bold">Warranty cards, certificates & site photos</p>
                      </div>
                    </div>
                    <div className="hidden md:block h-px flex-1 bg-slate-100 mx-4" />
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${(lead.finalExecutionStatus || "Pending") === "Done" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                        3
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Final Stage Approval</p>
                        <p className="text-[10px] text-slate-400 font-bold">Execution Review & Final Approval</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check if Execution Completed */}
                {!isExecutionFlowFinished ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-[2.5rem] p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6">
                    <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center mx-auto text-rose-500 shadow-md">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-900">Review & Settlement is Locked</h4>
                      <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                        This workflow becomes available only after all Project Control tasks/steps are successfully completed and submitted in the Project Execution stage.
                      </p>
                    </div>
                    {(() => {
                      const stepsList = [
                        { id: 14, condition: lead.newConnectionRequired === "Yes" },
                        { id: 1, condition: lead.s_docCorr_required === "Yes" },
                        { id: 2, condition: lead.loadExtensionRequired === "Yes" },
                        { id: 3 },
                        { id: 4, condition: lead.loanRequired === "Yes" },
                        { id: 5 },
                        { id: 6 },
                        { id: 7 },
                        { id: 8 },
                        { id: 9 },
                        { id: 10 },
                        { id: 11 },
                        { id: 12, condition: lead.loanRequired === "Yes" },
                        { id: 13 },
                      ].filter((step) => step.condition !== false);
                      const completed = stepsList.filter(
                        (step) => !!(lead as any)[`isStep${step.id}Submitted`],
                      ).length;
                      return (
                        <div className="inline-flex flex-col items-center gap-1.5 px-6 py-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Progress</p>
                          <p className="text-lg font-bold text-slate-800">{completed} / {stepsList.length} Steps Completed</p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Section 1: Payment Information */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-5 rounded bg-blue-600 block"></span>
                          Section 1: Payment Information
                        </h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">Verify financial transactions and capture extra discount records.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Project Value</span>
                          <span className="text-lg font-bold text-slate-800">₹{(Number(lead.finalRate) || 0).toLocaleString()}</span>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Amount Received</span>
                          <span className="text-lg font-bold text-slate-800">₹{totalReceived.toLocaleString()}</span>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-full">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Extra Discount (₹)</label>
                          <input
                            type="number"
                            placeholder="Enter manual extra discount..."
                            value={lead.handoverExtraDiscount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              handleUpdate({ handoverExtraDiscount: val }, true);
                            }}
                            disabled={lead.isHandoverAdminSubmitted}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                          />
                        </div>

                        {(() => {
                          const projectVal = Number(lead.finalRate) || 0;
                          const discount = Number(lead.handoverExtraDiscount) || 0;
                          const finalProjVal = projectVal - discount;
                          const dueAmt = finalProjVal - totalReceived > 0 ? finalProjVal - totalReceived : 0;
                          return (
                            <>
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Final Project Value</span>
                                <span className="text-lg font-bold text-slate-800">₹{finalProjVal.toLocaleString()}</span>
                              </div>

                              <div className={`rounded-2xl p-4 border ${dueAmt > 0 ? "bg-rose-50/50 border-rose-100 text-rose-700" : "bg-emerald-50/50 border-emerald-100 text-emerald-700"}`}>
                                <span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-75">Due Amount</span>
                                <span className="text-lg font-bold">₹{dueAmt.toLocaleString()}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Section 2: Admin Verification */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-5 rounded bg-indigo-600 block"></span>
                          Section 2: Admin Verification
                        </h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">Admin oversight verification and project redirection protocols.</p>
                      </div>

                      <div className="space-y-6">
                        {/* Verification fields */}
                        <div className="space-y-4">
                          {[
                            {
                              label: "All Payments Received",
                              field: "handoverPaymentsReceived",
                              value: lead.handoverPaymentsReceived,
                            },
                            {
                              label: "Site Fully Completed",
                              field: "handoverSiteCompleted",
                              value: lead.handoverSiteCompleted,
                            },
                            {
                              label: "Service Request for Bill Update Created",
                              field: "handoverBillUpdateCreated",
                              value: lead.handoverBillUpdateCreated,
                            },
                          ].map((item) => (
                            <div key={item.field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-xs font-bold text-slate-800">{item.label}</span>
                              <div className="flex gap-2 shrink-0">
                                {["Yes", "No"].map((opt) => {
                                  const isSelected = item.value === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      disabled={!isAdminUser || lead.isHandoverAdminSubmitted}
                                      onClick={() => {
                                        handleUpdate({ [item.field]: opt }, true);
                                      }}
                                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        isSelected
                                          ? opt === "Yes"
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                                            : "bg-rose-600 text-white shadow-md shadow-rose-600/10"
                                          : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Assignment to Next User */}
                        {!lead.isHandoverAdminSubmitted ? (
                          <div className="space-y-4 border-t border-slate-100 pt-5 mt-5">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assign Deliverables Stage To</label>
                              <select
                                value={selectedNextAssignee}
                                onChange={(e) => setSelectedNextAssignee(e.target.value)}
                                disabled={!isAdminUser}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                              >
                                <option value="">-- Choose Steward --</option>
                                {users.map((u) => (
                                  <option key={u.email} value={u.email}>
                                    {u.name} ({u.category || "Staff"})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => {
                                if (!lead.handoverPaymentsReceived || !lead.handoverSiteCompleted || !lead.handoverBillUpdateCreated) {
                                  showNotification("Please complete all three verification checks.", "warning");
                                  return;
                                }
                                if (!selectedNextAssignee) {
                                  showNotification("Please select the steward to complete the deliverables.", "warning");
                                  return;
                                }
                                const nextUser = users.find((u) => u.email === selectedNextAssignee);
                                handleUpdate({
                                  handoverNextAssigneeEmail: selectedNextAssignee,
                                  handoverNextAssigneeName: nextUser?.name || selectedNextAssignee,
                                  deliverablesAssignedEmail: selectedNextAssignee,
                                  deliverablesAssignedName: nextUser?.name || selectedNextAssignee,
                                  isHandoverAdminSubmitted: true,
                                }, true);
                                setNotification({
                                  type: "success",
                                  message: "Admin Verification completed and project assigned for Deliverables stage.",
                                });
                              }}
                              disabled={!isAdminUser || !lead.handoverPaymentsReceived || !lead.handoverSiteCompleted || !lead.handoverBillUpdateCreated || !selectedNextAssignee}
                              className="w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-600/15"
                            >
                              Complete Verification & Assign Deliverables
                            </button>
                            {!isAdminUser && (
                              <p className="text-[10px] text-rose-500 font-bold text-center">
                                ⚠️ Only Admin can complete the verification questions.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
                            <p className="text-xs font-bold text-indigo-800 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Verification & Redirection Complete
                            </p>
                            <div className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                              Assigned Deliverables Steward: <span className="font-extrabold text-indigo-950">{lead.deliverablesAssignedName}</span> ({lead.deliverablesAssignedEmail})
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "deliverables" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {/* Header Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-600 to-green-600 rounded-2xl md:rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-950 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full -mr-32 -mt-32 blur-[80px] animate-pulse" />
                    <div className="relative z-10 flex-1">
                      <div className="flex items-center gap-3 mb-3 md:mb-4">
                        <div className="h-px w-6 md:w-8 bg-teal-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-teal-400">
                          Finalization Deliverables
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-display font-bold mb-2 md:mb-3 tracking-tight md:tracking-tighter leading-tight bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
                        Project Deliverables Checklist
                      </h3>
                      <p className="text-slate-400 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                        Verify handover checklists, upload proof of completion signature and site photos, and prepare project for final review.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Stepper */}
                <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 opacity-50">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-emerald-500 text-white">
                        1
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Review & Settlement</p>
                        <p className="text-[10px] text-slate-400 font-bold">Verify payments, completion, & billing</p>
                      </div>
                    </div>
                    <div className="hidden md:block h-px flex-1 bg-slate-100 mx-4" />
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${lead.isDeliverablesSubmitted ? "bg-emerald-500 text-white" : "bg-blue-600 text-white animate-pulse"}`}>
                        2
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Deliverables Stage</p>
                        <p className="text-[10px] text-slate-400 font-bold">Warranty cards, certificates & site photos</p>
                      </div>
                    </div>
                    <div className="hidden md:block h-px flex-1 bg-slate-100 mx-4" />
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${(lead.finalExecutionStatus || "Pending") === "Done" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                        3
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800">Final Stage Approval</p>
                        <p className="text-[10px] text-slate-400 font-bold">Execution Review & Final Approval</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lock check */}
                {!lead.isHandoverAdminSubmitted ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-[2.5rem] p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6">
                    <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center mx-auto text-rose-500 shadow-md">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-900">Deliverables Tab is Locked</h4>
                      <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                        This tab will unlock as soon as the Review & Settlement stage is verified and approved by the Admin in the "Review & Settlement" tab.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Steward Assignment / Status Indicator */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          Responsible Steward / Specialist
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {lead.deliverablesAssignedEmail ? (
                            <span>Current Assignee: <strong className="text-slate-800">{lead.deliverablesAssignedName}</strong> ({lead.deliverablesAssignedEmail})</span>
                          ) : (
                            <span className="text-rose-500 font-bold">⚠️ Unassigned. Admin must assign a responsible user.</span>
                          )}
                        </p>
                      </div>

                      {isAdminUser && (
                        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assign To:</span>
                          <select
                            value={selectedDeliverablesAssignee || lead.deliverablesAssignedEmail || ""}
                            onChange={(e) => {
                              const email = e.target.value;
                              setSelectedDeliverablesAssignee(email);
                              const userObj = users.find((u) => u.email === email);
                              handleUpdate({
                                deliverablesAssignedEmail: email,
                                deliverablesAssignedName: userObj?.name || email,
                              }, true);
                              showNotification(`Deliverables stage successfully assigned to ${userObj?.name || email}`, "success");
                            }}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Choose Steward --</option>
                            {users.map((u) => (
                              <option key={u.email} value={u.email}>
                                {u.name} ({u.category || "Staff"})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const currentUserEmail = user?.email?.toLowerCase()?.trim();
                      const canComplete = isAdminUser || (lead.deliverablesAssignedEmail && lead.deliverablesAssignedEmail.toLowerCase().trim() === currentUserEmail);

                      return (
                        <div className="space-y-8">
                          {!canComplete && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
                              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                              <span>You are not authorized to complete these deliverables. Only the assigned steward (<strong>{lead.deliverablesAssignedName || "unassigned"}</strong>) or an Admin can submit.</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Block: Checklist */}
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
                              <div>
                                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-2.5 h-5 rounded bg-emerald-600 block"></span>
                                  Required Deliverables Checklist
                                </h4>
                                <p className="text-xs text-slate-400 font-bold mt-1">Check and verify that physical cards and bills have been dispatched to the customer.</p>
                              </div>

                              <div className="space-y-4">
                                {[
                                  {
                                    label: "Tax Invoice/Bill",
                                    field: "deliverableTaxInvoice",
                                    value: lead.deliverableTaxInvoice,
                                  },
                                  {
                                    label: "Inverter Warranty Card",
                                    field: "deliverableInverterWarranty",
                                    value: lead.deliverableInverterWarranty,
                                  },
                                  {
                                    label: "Panel Warranty Card",
                                    field: "deliverablePanelWarranty",
                                    value: lead.deliverablePanelWarranty,
                                  },
                                ].map((item) => (
                                  <div
                                    key={item.field}
                                    onClick={() => {
                                      if (lead.isDeliverablesSubmitted || !canComplete) return;
                                      handleUpdate({ [item.field]: !item.value }, true);
                                    }}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                      lead.isDeliverablesSubmitted || !canComplete ? "cursor-not-allowed opacity-75" : "cursor-pointer"
                                    } ${
                                      item.value
                                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600"
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                      item.value ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"
                                    }`}>
                                      {item.value && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="text-xs font-extrabold tracking-tight uppercase">{item.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Right Block: File Uploads & Remarks */}
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
                              <div>
                                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-2.5 h-5 rounded bg-teal-600 block"></span>
                                  Proofs & Upload Documents
                                </h4>
                                <p className="text-xs text-slate-400 font-bold mt-1">Upload files documenting completion and customer satisfaction.</p>
                              </div>

                              <div className="space-y-4">
                                {/* Signature file upload */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Customer Signature (Completion Certificate)</p>
                                    {lead.deliverableCustomerSignaturePhotoUrl ? (
                                      <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ File uploaded successfully</p>
                                    ) : (
                                      <p className="text-[10px] text-slate-400 font-bold mt-1">Awaiting PDF / Image upload</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <label
                                      htmlFor="input-customer-sig"
                                      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                                        uploadingDoc || lead.isDeliverablesSubmitted || !canComplete ? "opacity-50 pointer-events-none" : ""
                                      }`}
                                    >
                                      {lead.deliverableCustomerSignaturePhotoUrl ? "Replace" : "Upload"}
                                      <input
                                        id="input-customer-sig"
                                        type="file"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => handleFileUpload(e, "Customer Signature on Completion Certificate", "deliverableCustomerSignaturePhotoUrl")}
                                        disabled={!!uploadingDoc || lead.isDeliverablesSubmitted || !canComplete}
                                      />
                                    </label>
                                    {lead.deliverableCustomerSignaturePhotoUrl && (
                                      <a
                                        href={lead.deliverableCustomerSignaturePhotoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl flex items-center justify-center shadow-sm"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Site Photos upload */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Site Photos</p>
                                    {lead.deliverableSitePhotosUrl ? (
                                      <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Photos uploaded successfully</p>
                                    ) : (
                                      <p className="text-[10px] text-slate-400 font-bold mt-1">Awaiting image upload</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <label
                                      htmlFor="input-site-photos"
                                      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                                        uploadingDoc || lead.isDeliverablesSubmitted || !canComplete ? "opacity-50 pointer-events-none" : ""
                                      }`}
                                    >
                                      {lead.deliverableSitePhotosUrl ? "Replace" : "Upload"}
                                      <input
                                        id="input-site-photos"
                                        type="file"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => handleFileUpload(e, "Site Photos", "deliverableSitePhotosUrl")}
                                        disabled={!!uploadingDoc || lead.isDeliverablesSubmitted || !canComplete}
                                      />
                                    </label>
                                    {lead.deliverableSitePhotosUrl && (
                                      <a
                                        href={lead.deliverableSitePhotosUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl flex items-center justify-center shadow-sm"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Upload Progress Indicator */}
                                {uploadingDoc && (
                                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1">Uploading: {uploadingDoc}</p>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                  </div>
                                )}

                                {/* Remarks */}
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Remarks</label>
                                  <textarea
                                    value={lead.deliverableRemarks || ""}
                                    onChange={(e) => handleUpdate({ deliverableRemarks: e.target.value }, true)}
                                    placeholder="Add finalization remarks..."
                                    disabled={lead.isDeliverablesSubmitted || !canComplete}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Completion button */}
                          {!lead.isDeliverablesSubmitted ? (
                            <div className="flex justify-end pt-4">
                              <button
                                onClick={() => {
                                  if (
                                    !lead.deliverableTaxInvoice ||
                                    !lead.deliverableInverterWarranty ||
                                    !lead.deliverablePanelWarranty ||
                                    !lead.deliverableCustomerSignaturePhotoUrl ||
                                    !lead.deliverableSitePhotosUrl
                                  ) {
                                    showNotification("Please complete all checkboxes and upload required proofs.", "warning");
                                    return;
                                  }
                                  handleUpdate({ isDeliverablesSubmitted: true }, true);
                                  setNotification({
                                    type: "success",
                                    message: "All deliverables verified and submitted. Ready for final review.",
                                  });
                                }}
                                disabled={
                                  !lead.deliverableTaxInvoice ||
                                  !lead.deliverableInverterWarranty ||
                                  !lead.deliverablePanelWarranty ||
                                  !lead.deliverableCustomerSignaturePhotoUrl ||
                                  !lead.deliverableSitePhotosUrl ||
                                  !canComplete
                                }
                                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-emerald-600/10"
                              >
                                Complete & Submit Deliverables
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-10 pt-4">
                              {/* Success card */}
                              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-800">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold">Deliverables Submitted Successfully</p>
                                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Workflow progressed to Final Stage: Final Execution Review & Approval.</p>
                                </div>
                              </div>
                            </div>
                          )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      
          {activeTab === "final_review" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display tracking-tight text-slate-900">
                    Final Execution Review
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Approve project execution after deliverables are submitted
                  </p>
                </div>
              </div>
              
              {!isExecutionFlowFinished ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center shadow-inner">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">Execution in Progress</p>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                      The project execution milestones are not yet completed. This section will unlock once the execution workflow is finished.
                    </p>
                  </div>
                </div>
              ) : (
                <>

                    {isExecutionFlowFinished && !lead.isDeliverablesSubmitted && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 p-8 bg-amber-50 border border-amber-200 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm"
                      >
                        <div className="flex items-center gap-4 text-amber-900">
                          <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-base font-bold">Execution Milestones Completed!</p>
                            <p className="text-xs text-slate-500 font-semibold mt-1">
                              The project execution is finished. The workflow has progressed to the <strong className="text-amber-800">Review & Settlement</strong> and <strong className="text-amber-800">Deliverables</strong> stages.
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-1">
                              Final Execution Review & Approval will be unlocked here once the Deliverables are submitted.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (lead.isHandoverAdminSubmitted) {
                              setActiveTab("deliverables");
                            } else {
                              setActiveTab("handover");
                            }
                          }}
                          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                        >
                          Go to {lead.isHandoverAdminSubmitted ? "Deliverables" : "Review & Settlement"}
                        </button>
                      </motion.div>
                    )}

                    {isExecutionFlowFinished && lead.isDeliverablesSubmitted && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-[3rem] relative"
                      >
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600" />

                        <div className="p-8 md:p-12 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 bg-slate-50/50">
                          <div className="space-y-4 max-w-2xl flex-1 text-left">
                            <div className="flex items-center gap-2.5">
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                                All Milestones Met
                              </span>
                              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                                Lifecycle Section ID: 14
                              </span>
                            </div>

                            <h3 className="text-xl md:text-3xl font-display font-black text-slate-900 tracking-tight">
                              Final Execution Review & Approval
                            </h3>

                            <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                              All{" "}
                              {lead.newConnectionRequired === "Yes"
                                ? "14"
                                : "13"}{" "}
                              project execution protocols and technical stages
                              have been fully completed. The Project Incharge or
                              System Admin must now verify the underlying
                              payment confirmations, technical credentials, and
                              finalize the project transition.
                            </p>

                            {/* Informative checks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  ✓
                                </div>
                                {lead.newConnectionRequired === "Yes"
                                  ? "14"
                                  : "13"}{" "}
                                Execution Milestones Done
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  ✓
                                </div>
                                Financial Audit Ready
                              </div>
                            </div>

                            {/* Interactive Review & Verification Options */}
                            <div className="pt-4 space-y-3">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Select Review & Verification Status:
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {[
                                  {
                                    value: "Pending",
                                    label: "Pending",
                                    desc: "Awaiting review",
                                    color:
                                      "border-slate-200 text-slate-700 bg-slate-50",
                                    activeColor:
                                      "bg-slate-100 border-slate-400 text-slate-900 ring-1 ring-slate-400",
                                    icon: Clock,
                                  },
                                  {
                                    value: "Under Review",
                                    label: "Under Review",
                                    desc: "Audit in progress",
                                    color:
                                      "border-amber-100 text-amber-700 bg-amber-50/50",
                                    activeColor:
                                      "bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400",
                                    icon: FileText,
                                  },
                                  {
                                    value: "Done",
                                    label: "Done",
                                    desc: "Approved for completion",
                                    color:
                                      "border-emerald-100 text-emerald-700 bg-emerald-50/50",
                                    activeColor:
                                      "bg-emerald-5 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20",
                                    icon: CheckCircle2,
                                  },
                                ].map((opt) => {
                                  const isSelected =
                                    (lead.finalExecutionStatus || "Pending") ===
                                    opt.value;
                                  const isCompleted =
                                    lead.isExecutionSubmitted ||
                                    lead.status === "Completed";
                                  // Admins & Stewards can ALWAYS edit / change the status
                                  const canEdit = isAdminUser || isSteward;
                                  const IconComp = opt.icon;

                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => {
                                        if (opt.value === "Done") {
                                          const isFullPayment =
                                            lead.payment_status === "Full" ||
                                            dueAmount <= 0;
                                          if (!isFullPayment) {
                                            showNotification(
                                              `Payment Pending! Outstanding balance of ₹${dueAmount.toLocaleString()} is remaining. Full payment must be received to mark execution as Done.`,
                                              "warning",
                                            );
                                            return;
                                          }
                                        }
                                        const updates: any = {
                                          finalExecutionStatus:
                                            opt.value as any,
                                        };
                                        // Reopen project if moving back from Completed to Pending or Under Review
                                        if (
                                          isCompleted &&
                                          (opt.value === "Pending" ||
                                            opt.value === "Under Review")
                                        ) {
                                          updates.isExecutionSubmitted = false;
                                          updates.status = "Won";
                                        }
                                        handleUpdate(updates, true);
                                      }}
                                      className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all duration-300 flex-1 min-w-[140px] ${
                                        isSelected
                                          ? opt.activeColor
                                          : isCompleted
                                            ? "opacity-40 border-slate-200 bg-slate-50 text-slate-400"
                                            : "border-slate-200 bg-white hover:bg-slate-50/50 text-slate-600"
                                      } ${canEdit ? "cursor-pointer active:scale-95 hover:shadow-sm" : "cursor-not-allowed"}`}
                                    >
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-white shadow-xs" : "bg-slate-100"}`}
                                      >
                                        <IconComp className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase tracking-tight">
                                          {opt.label}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">
                                          {opt.desc}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="w-full lg:w-auto self-end lg:self-center">
                            {lead.isExecutionSubmitted ||
                            lead.status === "Completed" ? (
                              <div className="px-8 py-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                                    Project Completed
                                  </p>
                                  <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
                                    Execution finalized & approved
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {isAdminUser || isSteward ? (
                                  <div className="space-y-3">
                                    <button
                                      onClick={() => {
                                        const isFullPayment =
                                          lead.payment_status === "Full" ||
                                          dueAmount <= 0;
                                        if (!isFullPayment) {
                                          showNotification(
                                            `Payment Pending! Outstanding balance of ₹${dueAmount.toLocaleString()} is remaining. Cannot approve final execution.`,
                                            "warning",
                                          );
                                          return;
                                        }
                                        handleUpdate(
                                          {
                                            isExecutionSubmitted: true,
                                            status: "Completed",
                                            finalExecutionStatus: "Done",
                                            updatedAt: new Date() as any,
                                          },
                                          false,
                                        );
                                        setNotification({
                                          type: "success",
                                          message:
                                            "Project finalized and moved to Completed filter.",
                                        });
                                      }}
                                      disabled={
                                        isSaving ||
                                        (lead.finalExecutionStatus ||
                                          "Pending") !== "Done"
                                      }
                                      className="w-full lg:w-auto px-10 py-5 bg-slate-950 text-white hover:bg-emerald-700 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-950 disabled:cursor-not-allowed"
                                    >
                                      {isSaving ? (
                                        <Clock className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                      )}
                                      {(lead.finalExecutionStatus ||
                                        "Pending") !== "Done"
                                        ? "Select 'Done' to approve"
                                        : "Verify & Approve Final Execution"}
                                    </button>
                                    {(lead.finalExecutionStatus ||
                                      "Pending") !== "Done" && (
                                      <p className="text-[10px] text-amber-600 font-semibold text-center">
                                        ⚠️ Mark status as 'Done' above to unlock
                                        the approval button.
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-amber-800 text-[10px] font-bold max-w-xs leading-relaxed">
                                    ⚠️ Awaiting review and approval from the
                                    Project Incharge or Admin.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                </>
              )}
            </div>
          )}
          {activeTab === "documents" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display tracking-tight text-slate-900">
                    Document Hub
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Centralized view of all documents uploaded for this lead.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
                  <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search documents by name..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900"
                    />
                  </div>
                  <div className="w-full md:w-64">
                    <select
                      value={docSelectedSection}
                      onChange={(e) => setDocSelectedSection(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900 cursor-pointer"
                    >
                      <option value="All">All Sections</option>
                      {Array.from(new Set(DOCUMENT_MAP.map((doc) => doc.section))).map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DOCUMENT_MAP.filter((doc) => {
                    const matchesSearch = doc.label.toLowerCase().includes(docSearchQuery.toLowerCase());
                    const matchesSection = docSelectedSection === "All" || doc.section === docSelectedSection;
                    return matchesSearch && matchesSection;
                  }).map((doc) => {
                    const docUrl = lead[doc.key] as string;
                    const isUploaded = !!docUrl;
                    return (
                      <div key={doc.key} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all group flex flex-col justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUploaded ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2" title={doc.label}>{doc.label}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{doc.section}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-slate-100">
                          {isUploaded ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Uploaded</span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Pending</span>
                          )}
                          <div className="flex gap-2">
                            {isUploaded ? (
                              <>
                                <a
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  View
                                </a>
                                <a
                                  href={docUrl}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </>
                            ) : (
                              <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed">
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {DOCUMENT_MAP.filter((doc) => {
                    const matchesSearch = doc.label.toLowerCase().includes(docSearchQuery.toLowerCase());
                    const matchesSection = docSelectedSection === "All" || doc.section === docSelectedSection;
                    return matchesSearch && matchesSection;
                  }).length === 0 && (
                    <div className="col-span-full py-16 text-center bg-slate-50 border border-slate-200 border-dashed rounded-3xl">
                      <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-slate-900 mb-1">No Documents Found</h4>
                      <p className="text-slate-500 font-medium max-w-md mx-auto">
                        No documents match your current search or section filter.
                      </p>
                      {(docSearchQuery || docSelectedSection !== "All") && (
                        <button
                          onClick={() => {
                            setDocSearchQuery("");
                            setDocSelectedSection("All");
                          }}
                          className="mt-6 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          </>
        )}
      </div>

      {/* Task Remark Modal */}
      <AnimatePresence mode="wait">
        {remarkModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setRemarkModal((prev) => ({ ...prev, isOpen: false }))
              }
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
            >
              <div
                className={`p-8 md:p-10 ${
                  remarkModal.type === "complete"
                    ? "bg-emerald-50"
                    : remarkModal.type === "assign"
                      ? "bg-blue-50"
                      : remarkModal.type === "revoke"
                        ? "bg-slate-50"
                        : "bg-rose-50"
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      remarkModal.type === "complete"
                        ? "bg-emerald-100 text-emerald-600"
                        : remarkModal.type === "assign"
                          ? "bg-blue-100 text-blue-600"
                          : remarkModal.type === "revoke"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {remarkModal.type === "complete" ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : remarkModal.type === "assign" ? (
                      <UserPlus className="w-8 h-8" />
                    ) : remarkModal.type === "revoke" ? (
                      <RotateCcw className="w-8 h-8" />
                    ) : (
                      <Shield className="w-8 h-8" />
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setRemarkModal((prev) => ({ ...prev, isOpen: false }))
                    }
                    className="p-2 hover:bg-white rounded-xl transition-all"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {remarkModal.title}
                </h3>
                <p className="text-slate-500 font-medium">
                  {remarkModal.description}
                </p>
              </div>

              <div className="p-8 md:p-10 space-y-6">
                {remarkModal.type === "assign" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Select Operational Doer
                    </label>
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="">Choose Executive...</option>
                      {users.map((u, idx) => (
                        <option key={`${u.email}-${idx}`} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {remarkModal.type === "assign-back" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Status of Task
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as any)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="Assigned-Back">
                        Still Pending (Need Support)
                      </option>
                      <option value="Completed">
                        Completed (Ready for Review)
                      </option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {remarkModal.type === "assign"
                      ? "Assignment Note"
                      : "Intel / Remark Message"}
                  </label>
                  <textarea
                    value={stepRemarkInput}
                    onChange={(e) => setStepRemarkInput(e.target.value)}
                    placeholder={
                      remarkModal.type === "assign"
                        ? "Add a specific instruction for the doer..."
                        : "Enter your final submission details or handover remarks..."
                    }
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 min-h-[120px] transition-all resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      setRemarkModal((prev) => ({ ...prev, isOpen: false }))
                    }
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStepAction}
                    disabled={
                      isSaving ||
                      (remarkModal.type === "assign" && !selectedAssignee)
                    }
                    className={`flex-[2] py-4 ${remarkModal.btnColor} text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {isSaving ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {remarkModal.btnText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{
              opacity: 0,
              y: 20,
              x: "-50%",
              scale: 0.9,
              transition: { duration: 0.2 },
            }}
            className="fixed bottom-10 left-1/2 z-[100] flex items-center gap-4 px-6 py-4 bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl min-w-[320px] max-w-md w-[90%] md:w-auto"
          >
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 ${
                notification.type === "success"
                  ? "bg-emerald-100 text-emerald-600"
                  : notification.type === "error"
                    ? "bg-rose-100 text-rose-600"
                    : "bg-amber-100 text-amber-600"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : notification.type === "error" ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {notification.type === "success"
                  ? "Update Successful"
                  : notification.type === "error"
                    ? "Operational Error"
                    : "Attention Required"}
              </h4>
              <p className="text-sm text-slate-800 font-bold leading-tight truncate">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className={`absolute bottom-0 left-0 h-1 rounded-b-2xl ${
                notification.type === "success"
                  ? "bg-emerald-500"
                  : notification.type === "error"
                    ? "bg-rose-500"
                    : "bg-emerald-500"
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
