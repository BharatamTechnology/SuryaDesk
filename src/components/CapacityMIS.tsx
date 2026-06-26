import React, { useMemo, useState } from "react";
import { Lead } from "../types";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { X } from "lucide-react";

interface CapacityMISProps {
  leads: Lead[];
}

export default function CapacityMIS({ leads }: CapacityMISProps) {
  const [activeCategory, setActiveCategory] = useState<
    "totalWon" | "implemented" | "pending" | "inProgress" | null
  >(null);

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
    let totalWon = 0;
    let implemented = 0;
    let pending = 0; // Won but not past step 8
    let inProgress = 0; // Won, past step 8, but not completed

    const listTotalWon: Lead[] = [];
    const listImplemented: Lead[] = [];
    const listPending: Lead[] = [];
    const listInProgress: Lead[] = [];

    leads.forEach((l) => {
      if (
        l.status === "Won" ||
        l.status === "Converted" ||
        l.status === "Completed"
      ) {
        const kw = getCapacity(l);
        totalWon += kw;
        listTotalWon.push(l);

        if (l.status === "Completed") {
          implemented += kw;
          listImplemented.push(l);
        } else {
          // Check if past Step 8 (Store Incharge)
          const isPastStep8 = l.step8Status === "Completed";
          if (!isPastStep8) {
            pending += kw;
            listPending.push(l);
          } else {
            inProgress += kw;
            listInProgress.push(l);
          }
        }
      }
    });

    return {
      stats: { totalWon, implemented, pending, inProgress },
      lists: {
        totalWon: listTotalWon,
        implemented: listImplemented,
        pending: listPending,
        inProgress: listInProgress,
      },
    };
  }, [leads]);

  const statusData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    leads.forEach((l) => {
      const status = l.status || "Other";
      groups[status] = (groups[status] || 0) + getCapacity(l);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const activeList = activeCategory ? lists[activeCategory] : [];
  const categoryTitle =
    activeCategory === "totalWon"
      ? "Total Won Capacity"
      : activeCategory === "implemented"
        ? "Implemented Capacity"
        : activeCategory === "pending"
          ? "Pending Capacity"
          : activeCategory === "inProgress"
            ? "In Progress Capacity"
            : "";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveCategory("totalWon")}
          className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-1 ${activeCategory === "totalWon" ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100"}`}
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase">
            Total Won Capacity
          </h3>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatKW(stats.totalWon)} KW
          </p>
        </div>
        <div
          onClick={() => setActiveCategory("implemented")}
          className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-1 ${activeCategory === "implemented" ? "bg-green-50 border-green-200" : "bg-white border-slate-100"}`}
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase">
            Implemented Capacity
          </h3>
          <p className="text-2xl font-black text-green-600 mt-1">
            {formatKW(stats.implemented)} KW
          </p>
        </div>
        <div
          onClick={() => setActiveCategory("pending")}
          className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-1 ${activeCategory === "pending" ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"}`}
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase">
            Pending Capacity
          </h3>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatKW(stats.pending)} KW
          </p>
        </div>
        <div
          onClick={() => setActiveCategory("inProgress")}
          className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-1 ${activeCategory === "inProgress" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"}`}
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase">
            In Progress Capacity
          </h3>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {formatKW(stats.inProgress)} KW
          </p>
        </div>
      </div>

      {activeCategory && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80 mt-6 relative">
          <button
            onClick={() => setActiveCategory(null)}
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            Details: {categoryTitle}
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {activeList.length} leads
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                  <th className="py-3 px-4 font-bold">Ref</th>
                  <th className="py-3 px-4 font-bold">Client Name</th>
                  <th className="py-3 px-4 font-bold">Capacity (KW)</th>
                  <th className="py-3 px-4 font-bold">Current State</th>
                  <th className="py-3 px-4 font-bold">Current Owner</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeList.map((lead) => {
                  const currentStep = getGeneralActiveStep(lead);
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-indigo-600 truncate max-w-[100px]">
                        {lead.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {lead.customerName || "-"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {formatKW(getCapacity(lead))} KW
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium text-xs border border-amber-100/50">
                          {currentStep.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                        {currentStep.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            lead.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : lead.status === "Won"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                        >
                          {lead.status || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {activeList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No leads found in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold mb-4">Capacity by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Placeholder for Trends - requires date parsing logic similar to MISReport */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold mb-4">
            Capacity Trends (Placeholder)
          </h3>
          <p className="text-sm text-slate-500">
            Trend chart implementation would go here, utilizing timeline data.
          </p>
        </div>
      </div>
    </div>
  );
}
