import React, { useMemo, useState, useEffect } from "react";
import { Lead } from "../types";
import {
  X,
  Users,
  Sparkles,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  Phone,
  User,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CapacityMISProps {
  leads: Lead[];
  onLeadSelect?: (leadId: string) => void;
}

export default function CapacityMIS({ leads, onLeadSelect }: CapacityMISProps) {
  const [activeCategory, setActiveCategory] = useState<
    | "wonNotFinalized"
    | "toBeStarted"
    | "inProgress"
    | "toBeCommissioned"
    | "toBeSettled"
    | "implemented"
    | null
  >(() => {
    const saved = sessionStorage.getItem("capacity_activeCategory");
    if (
      saved &&
      [
        "wonNotFinalized",
        "toBeStarted",
        "inProgress",
        "toBeCommissioned",
        "toBeSettled",
        "implemented",
      ].includes(saved)
    ) {
      return saved as any;
    }
    return null;
  });

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (activeCategory) {
      sessionStorage.setItem("capacity_activeCategory", activeCategory);
    } else {
      sessionStorage.removeItem("capacity_activeCategory");
    }
    setSearchQuery("");
  }, [activeCategory]);

  const getCapacity = (lead: Lead) => {
    const kw = parseFloat(lead.finalKw || lead.requiredKw || "0");
    return isNaN(kw) ? 0 : kw;
  };

  const formatKW = (kw: number) => kw.toFixed(2);

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
      emailField: "s_newConn_assignedToEmail",
      nameField: "s_newConn_assignedTo",
      submitField: "isStep14Submitted",
      condition: (l: any) => l.newConnectionRequired === "Yes",
      label: "Step 1: New Connection",
      tab: "execution",
      stepId: 14,
    },
    {
      emailField: "s_docCorr_assignedToEmail",
      nameField: "s_docCorr_assignedTo",
      submitField: "isStep1Submitted",
      condition: (l: any) => l.s_docCorr_required === "Yes",
      label: "Step 2: Doc Correction",
      tab: "execution",
      stepId: 1,
    },
    {
      emailField: "s_loadExt_assignedToEmail",
      nameField: "s_loadExt_assignedTo",
      submitField: "isStep2Submitted",
      condition: (l: any) => l.loadExtensionRequired === "Yes",
      label: "Step 3: Load Extension",
      tab: "execution",
      stepId: 2,
    },
    {
      emailField: "execution_assignedToEmail",
      nameField: "execution_assignedTo",
      submitField: "isStep3Submitted",
      label: "Step 4: Online Reg",
      tab: "execution",
      stepId: 3,
    },
    {
      emailField: "s4_loanAssignedToEmail",
      nameField: "s4_loanAssignedTo",
      submitField: "isStep4Submitted",
      condition: (l: any) => l.loanRequired === "Yes",
      label: "Step 5: Loan Process",
      tab: "execution",
      stepId: 4,
    },
    {
      emailField: "s5_storeDispatchAssignedToEmail",
      nameField: "s5_storeDispatchAssignedTo",
      submitField: "isStep5Submitted",
      label: "Step 6: Meter Dispatch",
      tab: "execution",
      stepId: 5,
    },
    {
      emailField: "s5_discomPreAssignedToEmail",
      nameField: "s5_discomPreAssignedTo",
      submitField: "isStep6Submitted",
      label: "Step 7: Discom Pre-Install",
      tab: "execution",
      stepId: 6,
    },
    {
      emailField: "s6_inchargeAssignedToEmail",
      nameField: "s6_inchargeAssignedTo",
      submitField: "isStep7Submitted",
      label: "Step 8: Site Incharge",
      tab: "execution",
      stepId: 7,
    },
    {
      emailField: "s5_storeInchargeAssignedToEmail",
      nameField: "s5_storeInchargeAssignedTo",
      submitField: "isStep8Submitted",
      label: "Step 9: Store Incharge",
      tab: "execution",
      stepId: 8,
    },
    {
      emailField: "s6_assignedToEmail",
      nameField: "s6_assignedTo",
      submitField: "isStep9Submitted",
      label: "Step 10: Site Team",
      tab: "execution",
      stepId: 9,
    },
    {
      emailField: "s7_assignedToEmail",
      nameField: "s7_assignedTo",
      submitField: "isStep10Submitted",
      label: "Step 11: Office Exec",
      tab: "execution",
      stepId: 10,
    },
    {
      emailField: "s8_assignedToEmail",
      nameField: "s8_assignedTo",
      submitField: "isStep11Submitted",
      label: "Step 12: Discom Post-Install",
      tab: "execution",
      stepId: 11,
    },
    {
      emailField: "s9_assignedToEmail",
      nameField: "s9_assignedTo",
      submitField: "isStep12Submitted",
      condition: (l: any) => l.loanRequired === "Yes",
      label: "Step 13: Loan Final",
      tab: "execution",
      stepId: 12,
    },
    {
      emailField: "s11_assignedToEmail",
      nameField: "s11_assignedTo",
      submitField: "isStep13Submitted",
      label: "Step 14: Subsidy",
      tab: "execution",
      stepId: 13,
    },
    {
      emailField: "s12_assignedToEmail",
      nameField: "s12_assignedTo",
      submitField: "isStep15Submitted",
      label: "Step 15: Insurance",
      tab: "execution",
      stepId: 15,
    },
    {
      emailField: "projectInchargeEmail",
      nameField: "projectInchargeName",
      submitField: "isExecutionSubmitted",
      label: "Final Execution Review",
      tab: "project_incharge",
    },
  ];

  const getGeneralActiveStep = (l: any) => {
    if (l.status === "Lost")
      return { label: "Lead Closed", name: "Lost / Closed" };
    if (l.status === "Converted")
      return { label: "Lead Converted", name: "Approved" };
    if (l.status === "Completed")
      return { label: "Project Completed", name: "Verified & Closed" };

    const hasReachedFurtherSteps = l.status === "Won";

    const currentStepIndex = SEQUENCE.findIndex((step, index) => {
      if (!hasReachedFurtherSteps && index >= 3) return false;
      if (hasReachedFurtherSteps && index < 3) return false;
      if (step.condition && !step.condition(l)) return false;
      return !(l as any)[step.submitField];
    });

    if (currentStepIndex !== -1) {
      const currentStep = SEQUENCE[currentStepIndex];
      const assignedName = (l as any)[currentStep.nameField] || "Unassigned";
      return { label: currentStep.label, name: assignedName };
    }

    return { label: "Completed", name: "None" };
  };

  const { stats, lists } = useMemo(() => {
    let wonNotFinalizedKw = 0;
    let toBeStartedKw = 0;
    let inProgressKw = 0;
    let toBeCommissionedKw = 0;
    let toBeSettledKw = 0;
    let implementedKw = 0;

    const listWonNotFinalized: Lead[] = [];
    const listToBeStarted: Lead[] = [];
    const listInProgress: Lead[] = [];
    const listToBeCommissioned: Lead[] = [];
    const listToBeSettled: Lead[] = [];
    const listImplemented: Lead[] = [];

    leads.forEach((l) => {
      if (l.status === "Won" || l.status === "Completed") {
        const kw = getCapacity(l);

        // 6. Implemented: Count all leads that have reached the Final Execution Review & Approval stage
        if (l.isExecutionSubmitted === true || l.status === "Completed") {
          implementedKw += kw;
          listImplemented.push(l);
        }
        // 1. Won But Not Finalized: Count won leads that have progressed only up to Project Details (Accounts not completed)
        else if (l.status === "Won" && l.isAccountsSubmitted !== true) {
          wonNotFinalizedKw += kw;
          listWonNotFinalized.push(l);
        }
        // 2. To Be Started: Count all leads between Accounts section and Step 8 SITE INCHARGE (not completed)
        else if (l.isAccountsSubmitted === true && l.isStep7Submitted !== true) {
          toBeStartedKw += kw;
          listToBeStarted.push(l);
        }
        // 3. In Progress: Count leads currently in Step 9 STORE INCHARGE and Step 10 SITE TEAM (Site Incharge completed but Site Team not completed)
        else if (l.isStep7Submitted === true && l.isStep9Submitted !== true) {
          inProgressKw += kw;
          listInProgress.push(l);
        }
        // 4. To Be Commissioned: Count leads in OFFICE EXEC and DISCOM post-install stages (Site Team completed but Discom Post-Install not completed)
        else if (l.isStep9Submitted === true && l.isStep11Submitted !== true) {
          toBeCommissionedKw += kw;
          listToBeCommissioned.push(l);
        }
        // 5. To Be Settled: Count leads in LOAN OFFICER (Post-Install), Subsidy, New Review, Finalized (Discom Post-Install completed but execution review not approved)
        else if (l.isStep11Submitted === true) {
          toBeSettledKw += kw;
          listToBeSettled.push(l);
        }
      }
    });

    return {
      stats: {
        wonNotFinalized: wonNotFinalizedKw,
        toBeStarted: toBeStartedKw,
        inProgress: inProgressKw,
        toBeCommissioned: toBeCommissionedKw,
        toBeSettled: toBeSettledKw,
        implemented: implementedKw,
      },
      lists: {
        wonNotFinalized: listWonNotFinalized,
        toBeStarted: listToBeStarted,
        inProgress: listInProgress,
        toBeCommissioned: listToBeCommissioned,
        toBeSettled: listToBeSettled,
        implemented: listImplemented,
      },
    };
  }, [leads]);

  // Overall statistics for tracked leads
  const totalTrackedKW = useMemo(() => {
    return (
      stats.wonNotFinalized +
      stats.toBeStarted +
      stats.inProgress +
      stats.toBeCommissioned +
      stats.toBeSettled +
      stats.implemented
    );
  }, [stats]);

  const totalTrackedLeads = useMemo(() => {
    return (
      lists.wonNotFinalized.length +
      lists.toBeStarted.length +
      lists.inProgress.length +
      lists.toBeCommissioned.length +
      lists.toBeSettled.length +
      lists.implemented.length
    );
  }, [lists]);

  const CARDS_CONFIG = [
    {
      key: "wonNotFinalized" as const,
      label: "Won But Not Finalized",
      tagline: "Project Details pending",
      icon: Sparkles,
      // Style parameters for Violet Theme
      activeBg: "bg-gradient-to-br from-violet-50/90 to-violet-100/40 border-violet-500 shadow-md ring-2 ring-violet-200/50",
      inactiveBorder: "border-l-4 border-l-violet-500 border-slate-100",
      inactiveBg: "bg-slate-50/50 hover:bg-violet-50/30 hover:border-violet-200 hover:shadow-sm",
      iconActive: "bg-violet-600 text-white shadow-sm shadow-violet-500/20",
      iconInactive: "bg-violet-50 text-violet-600 group-hover:scale-110",
      badgeActive: "bg-violet-600 text-white",
      badgeInactive: "bg-violet-100 text-violet-800 font-extrabold",
      barColor: "bg-violet-600",
      accentText: "text-violet-900",
      accentSubText: "text-violet-600",
    },
    {
      key: "toBeStarted" as const,
      label: "To Be Started",
      tagline: "Accounts to Step 8",
      icon: Clock,
      // Style parameters for Sky/Blue Theme
      activeBg: "bg-gradient-to-br from-sky-50/90 to-sky-100/40 border-sky-500 shadow-md ring-2 ring-sky-200/50",
      inactiveBorder: "border-l-4 border-l-sky-500 border-slate-100",
      inactiveBg: "bg-slate-50/50 hover:bg-sky-50/30 hover:border-sky-200 hover:shadow-sm",
      iconActive: "bg-sky-600 text-white shadow-sm shadow-sky-500/20",
      iconInactive: "bg-sky-50 text-sky-600 group-hover:scale-110",
      badgeActive: "bg-sky-600 text-white",
      badgeInactive: "bg-sky-100 text-sky-800 font-extrabold",
      barColor: "bg-sky-500",
      accentText: "text-sky-900",
      accentSubText: "text-sky-600",
    },
    {
      key: "inProgress" as const,
      label: "In Progress",
      tagline: "Step 9 & Step 10",
      icon: Users,
      // Style parameters for Amber Theme
      activeBg: "bg-gradient-to-br from-amber-50/90 to-amber-100/40 border-amber-500 shadow-md ring-2 ring-amber-200/50",
      inactiveBorder: "border-l-4 border-l-amber-500 border-slate-100",
      inactiveBg: "bg-slate-50/50 hover:bg-amber-50/30 hover:border-amber-200 hover:shadow-sm",
      iconActive: "bg-amber-600 text-white shadow-sm shadow-amber-500/20",
      iconInactive: "bg-amber-50 text-amber-600 group-hover:scale-110",
      badgeActive: "bg-amber-600 text-white",
      badgeInactive: "bg-amber-100 text-amber-800 font-extrabold",
      barColor: "bg-amber-500",
      accentText: "text-amber-900",
      accentSubText: "text-amber-600",
    },
    {
      key: "toBeCommissioned" as const,
      label: "To Be Commissioned",
      tagline: "Step 11 & Step 12",
      icon: TrendingUp,
      // Style parameters for Indigo Theme
      activeBg: "bg-gradient-to-br from-indigo-50/90 to-indigo-100/40 border-indigo-500 shadow-md ring-2 ring-indigo-200/50",
      inactiveBorder: "border-l-4 border-l-indigo-500 border-slate-100",
      inactiveBg: "bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-200 hover:shadow-sm",
      iconActive: "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20",
      iconInactive: "bg-indigo-50 text-indigo-600 group-hover:scale-110",
      badgeActive: "bg-indigo-600 text-white",
      badgeInactive: "bg-indigo-100 text-indigo-800 font-extrabold",
      barColor: "bg-indigo-600",
      accentText: "text-indigo-900",
      accentSubText: "text-indigo-600",
    },
    {
      key: "toBeSettled" as const,
      label: "To Be Settled",
      tagline: "Step 13, 14 & review",
      icon: AlertCircle,
      // Style parameters for Rose Theme
      activeBg: "bg-gradient-to-br from-rose-50/90 to-rose-100/40 border-rose-500 shadow-md ring-2 ring-rose-200/50",
      inactiveBorder: "border-l-4 border-l-rose-500 border-slate-100",
      inactiveBg: "bg-slate-50/50 hover:bg-rose-50/30 hover:border-rose-200 hover:shadow-sm",
      iconActive: "bg-rose-600 text-white shadow-sm shadow-rose-500/20",
      iconInactive: "bg-rose-50 text-rose-600 group-hover:scale-110",
      badgeActive: "bg-rose-600 text-white",
      badgeInactive: "bg-rose-100 text-rose-800 font-extrabold",
      barColor: "bg-rose-500",
      accentText: "text-rose-900",
      accentSubText: "text-rose-600",
    },
    {
      key: "implemented" as const,
      label: "Implemented",
      tagline: "Execution Approved",
      icon: CheckCircle2,
      // Style parameters for Emerald Theme
      activeBg: "bg-gradient-to-br from-emerald-50/90 to-emerald-100/40 border-emerald-500 shadow-md ring-2 ring-emerald-200/50",
      inactiveBorder: "border-l-4 border-l-emerald-500 border-slate-100",
      inactiveBg: "bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-200 hover:shadow-sm",
      iconActive: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
      iconInactive: "bg-emerald-50 text-emerald-600 group-hover:scale-110",
      badgeActive: "bg-emerald-600 text-white",
      badgeInactive: "bg-emerald-100 text-emerald-800 font-extrabold",
      barColor: "bg-emerald-500",
      accentText: "text-emerald-900",
      accentSubText: "text-emerald-600",
    },
  ];

  const activeList = activeCategory ? lists[activeCategory] : [];

  const filteredActiveList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase();
    return activeList.filter(
      (l) =>
        (l.customerName || "").toLowerCase().includes(q) ||
        (l.id || "").toLowerCase().includes(q) ||
        (l.mobile || "").toLowerCase().includes(q) ||
        getGeneralActiveStep(l).label.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  const categoryTitle =
    activeCategory === "wonNotFinalized"
      ? "Won But Not Finalized"
      : activeCategory === "toBeStarted"
        ? "To Be Started"
        : activeCategory === "inProgress"
          ? "In Progress"
          : activeCategory === "toBeCommissioned"
            ? "To Be Commissioned"
            : activeCategory === "toBeSettled"
              ? "To Be Settled"
              : activeCategory === "implemented"
                ? "Implemented"
                : "";

  return (
    <div className="space-y-6">
      {/* Tracker Header Summary Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Abstract futuristic subtle glows */}
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-[10px] md:text-xs font-bold tracking-wider uppercase backdrop-blur-md border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Management Information System
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight mt-3 text-slate-50">
              Capacity Pipeline Tracker
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl font-medium">
              Interact with the capacity cards below to seamlessly filter and drill down into progressive execution stages of your solar leads.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 self-stretch md:self-auto justify-between shadow-inner">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">
                Total Portfolio
              </p>
              <h4 className="text-xl md:text-2xl font-black font-display text-indigo-300 mt-1.5">
                {formatKW(totalTrackedKW)}{" "}
                <span className="text-xs font-bold text-white">KW</span>
              </h4>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">
                Tracked Leads
              </p>
              <h4 className="text-xl md:text-2xl font-black font-display text-white mt-1.5">
                {totalTrackedLeads}{" "}
                <span className="text-xs font-bold text-slate-400">Leads</span>
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Grid of Capacity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {CARDS_CONFIG.map((card, i) => {
          const isActive = activeCategory === card.key;
          const value = stats[card.key];
          const count = lists[card.key].length;
          const Icon = card.icon;

          // Calculate percentage share of total portfolio
          const sharePct = totalTrackedKW > 0 ? (value / totalTrackedKW) * 100 : 0;

          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory(isActive ? null : card.key)}
              className={`p-5 rounded-2xl border cursor-pointer flex flex-col justify-between h-full min-h-[175px] transition-all duration-300 relative overflow-hidden group select-none ${
                isActive ? card.activeBg : `bg-white border-slate-100 ${card.inactiveBorder} ${card.inactiveBg}`
              }`}
            >
              {/* Highlight background element for active card */}
              <div
                className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150 bg-slate-900 pointer-events-none`}
              />

              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] tracking-wide transition-all ${
                      isActive ? card.badgeActive : card.badgeInactive
                    }`}
                  >
                    {count} {count === 1 ? "Lead" : "Leads"}
                  </span>

                  <div
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      isActive ? card.iconActive : card.iconInactive
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <h3 className={`text-xs md:text-sm font-black tracking-tight mt-4 leading-snug transition-colors ${
                  isActive ? card.accentText : "text-slate-800 group-hover:text-slate-900"
                }`}>
                  {card.label}
                </h3>
                <p className={`text-[10px] font-semibold leading-none mt-1 truncate ${isActive ? card.accentSubText : "text-slate-400"}`}>
                  {card.tagline}
                </p>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl md:text-2xl font-display font-black tracking-tight leading-none ${isActive ? card.accentText : "text-slate-900"}`}>
                    {formatKW(value)}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase">
                    KW
                  </span>
                </div>

                {/* Micro progress bar for share indicator */}
                <div className="mt-3">
                  <div className="flex justify-between items-center text-[9px] font-black text-slate-400 mb-1">
                    <span>Share</span>
                    <span>{sharePct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${card.barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Details list view with search filter */}
      <AnimatePresence mode="wait">
        {activeCategory && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-lg border border-slate-200/80 mt-6 relative overflow-hidden"
          >
            <div className="p-4 md:p-6">
              {/* Table Header Controls */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 text-slate-700 rounded-xl">
                    {React.createElement(CARDS_CONFIG.find(c => c.key === activeCategory)?.icon || Sparkles, { className: "w-5 h-5 text-indigo-600" })}
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                      Details: {categoryTitle}
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        {filteredActiveList.length} leads matching
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Showing matching leads presently in this lifecycle stage. Click on a customer name to view details.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto self-stretch lg:self-auto">
                  {/* Search input */}
                  <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search customer, Mobile, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-slate-700 placeholder-slate-400 shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveCategory(null)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors border border-slate-200/50"
                    title="Close details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Responsive Layout: Mobile Friendly Card List for small screens */}
              <div className="block md:hidden space-y-3">
                {filteredActiveList.map((lead) => {
                  const currentStep = getGeneralActiveStep(lead);
                  const isCompleted = lead.status === "Completed";
                  const isWon = lead.status === "Won";

                  return (
                    <div
                      key={lead.id}
                      className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <button
                            onClick={() => onLeadSelect?.(lead.id)}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-all text-left block text-sm"
                          >
                            {lead.customerName || "Unnamed Customer"}
                          </button>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-1">
                            <Hash className="w-3 h-3" />
                            {lead.id}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            {formatKW(getCapacity(lead))}{" "}
                            <span className="text-[10px] font-bold text-slate-400">KW</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-100/80">
                        <div>
                          <p className="text-slate-400 font-bold">ACTIVE STEP</p>
                          <p className="font-bold text-slate-700 mt-0.5 truncate max-w-full">
                            {currentStep.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">STEP OWNER</p>
                          <p className="font-bold text-slate-700 mt-0.5 truncate max-w-full">
                            {currentStep.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.mobile || "-"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : isWon
                                  ? "bg-violet-50 text-violet-700 border border-violet-100"
                                  : "bg-slate-100 text-slate-800 border border-slate-200"
                            }`}
                          >
                            {lead.status || "-"}
                          </span>

                          <button
                            onClick={() => onLeadSelect?.(lead.id)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredActiveList.length === 0 && (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No leads match your active search filter.
                  </div>
                )}
              </div>

              {/* Desktop Layout: Table view for large screens */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                      <th className="py-4 px-4 text-center w-12">#</th>
                      <th className="py-4 px-4">Ref ID</th>
                      <th className="py-4 px-4">Client Name</th>
                      <th className="py-4 px-4">Mobile</th>
                      <th className="py-4 px-4 text-right">Capacity (KW)</th>
                      <th className="py-4 px-4">Current Active State</th>
                      <th className="py-4 px-4">Step Owner</th>
                      <th className="py-4 px-4 text-center">Lifecycle Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredActiveList.map((lead, idx) => {
                      const currentStep = getGeneralActiveStep(lead);
                      const isCompleted = lead.status === "Completed";
                      const isWon = lead.status === "Won";

                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-slate-50/50 transition-colors group/row"
                        >
                          <td className="py-4 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-slate-400 max-w-[120px] truncate">
                            {lead.id}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => onLeadSelect?.(lead.id)}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline transition-all text-left flex items-center gap-1.5 group-hover/row:translate-x-0.5 duration-200"
                            >
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {lead.customerName || "-"}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-semibold">
                            {lead.mobile || "-"}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-slate-900 text-sm">
                            {formatKW(getCapacity(lead))} <span className="text-[10px] text-slate-400 font-bold">KW</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/60 text-indigo-700 font-bold text-[10px] border border-indigo-100/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                              {currentStep.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-semibold">
                            {currentStep.name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isWon
                                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                                    : "bg-slate-100 text-slate-800 border border-slate-200"
                              }`}
                            >
                              {lead.status || "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredActiveList.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50/30 font-medium">
                          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No leads match your active search filter inside this stage.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
