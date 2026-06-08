const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const replacement = `  const SEQUENCE = [
    { emailField: 'assignedToEmail', submitField: 'isSurveySubmitted', label: 'Survey' },
    { emailField: 'assignedSalesEmail', submitField: 'isSalesSubmitted', label: 'Sales Follow-up' },
    { emailField: 'projectAssigneeEmail', submitField: 'isFinancialsSubmitted', label: 'Financials' },
    { emailField: 'accAssigneeEmail', submitField: 'isAccountsSubmitted', label: 'Accounts' },
    { emailField: 'execution_assignedToEmail', submitField: 'isStep1Submitted', label: 'Step 1: Online Reg' },
    { emailField: 's4_loanAssignedToEmail', submitField: 'isStep2Submitted', condition: (l: any) => l.loanRequired === 'Yes', label: 'Step 2: Loan Process' },
    { emailField: 's5_storeDispatchAssignedToEmail', submitField: 'isStep3Submitted', label: 'Step 3: Meter Dispatch' },
    { emailField: 's5_discomPreAssignedToEmail', submitField: 'isStep4Submitted', label: 'Step 4: Discom' },
    { emailField: 's6_inchargeAssignedToEmail', submitField: 'isStep5Submitted', label: 'Step 5: Site Incharge' },
    { emailField: 's5_storeInchargeAssignedToEmail', submitField: 'isStep6Submitted', label: 'Step 6: Store' },
    { emailField: 's6_assignedToEmail', submitField: 'isStep7Submitted', label: 'Step 7: Site Team' },
    { emailField: 's7_assignedToEmail', submitField: 'isStep8Submitted', label: 'Step 8: Office Exec' },
    { emailField: 's8_assignedToEmail', submitField: 'isStep9Submitted', label: 'Step 9: Discom Final' },
    { emailField: 's9_assignedToEmail', submitField: 'isStep10Submitted', label: 'Step 10: Loan Final' },
    { emailField: 's10_assignedToEmail', submitField: 'isStep11Submitted', label: 'Step 11: Payment' },
    { emailField: 's11_assignedToEmail', submitField: 'isStep12Submitted', label: 'Step 12: Subsidy' }
  ];`;

// Replace the old SEQUENCE constant
code = code.replace(/const SEQUENCE = \[[\s\S]*?\];/, replacement);

// Also let's add getPendingActionName
const getPendingActionNameCode = `
  const getPendingActionName = (l: any) => {
    let currentStep = SEQUENCE.find(step => {
      if (step.condition && !step.condition(l)) return false; 
      return !(l as any)[step.submitField];
    });

    if (currentStep && typeof (l as any)[currentStep.emailField] === 'string' && (l as any)[currentStep.emailField].toLowerCase().trim() === normalizedUserEmail) {
      return currentStep.label;
    }
    return null;
  };
`;

code = code.replace(/const pendingActionLeads = leads\.filter/, getPendingActionNameCode + '\n  const pendingActionLeads = leads.filter');

// And finally inject it into the table
const newTableRender = `
                        {pendingActionLeads.some(p => p.id === lead.id) && (
                          <div className="flex items-center gap-1.5 ml-2 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-sm animate-pulse">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="text-[9px] font-black tracking-widest uppercase text-amber-700 whitespace-nowrap">
                              Assigned: {getPendingActionName(lead) || 'Action'}
                            </span>
                          </div>
                        )}
`;

code = code.replace(/\{pendingActionLeads\.some\(p => p\.id === lead\.id\) && \([\s\S]*?\}\)/, newTableRender.trim());

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log('Successfully updated Dashboard.tsx sequence and styles.');
