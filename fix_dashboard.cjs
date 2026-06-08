const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const replacement = `
  const SEQUENCE = [
    { emailField: 'assignedToEmail', submitField: 'isSurveySubmitted' },
    { emailField: 'assignedSalesEmail', submitField: 'isSalesSubmitted' },
    { emailField: 'projectAssigneeEmail', submitField: 'isFinancialsSubmitted' },
    { emailField: 'accAssigneeEmail', submitField: 'isAccountsSubmitted' },
    { emailField: 'execution_assignedToEmail', submitField: 'isStep1Submitted' },
    { emailField: 's4_loanAssignedToEmail', submitField: 'isStep2Submitted', condition: (l: any) => l.loanRequired === 'Yes' },
    { emailField: 's5_storeDispatchAssignedToEmail', submitField: 'isStep3Submitted' },
    { emailField: 's5_discomPreAssignedToEmail', submitField: 'isStep4Submitted' },
    { emailField: 's6_inchargeAssignedToEmail', submitField: 'isStep5Submitted' },
    { emailField: 's5_storeInchargeAssignedToEmail', submitField: 'isStep6Submitted' },
    { emailField: 's6_assignedToEmail', submitField: 'isStep7Submitted' },
    { emailField: 's7_assignedToEmail', submitField: 'isStep8Submitted' },
    { emailField: 's8_assignedToEmail', submitField: 'isStep9Submitted' },
    { emailField: 's9_assignedToEmail', submitField: 'isStep10Submitted' },
    { emailField: 's10_assignedToEmail', submitField: 'isStep11Submitted' },
    { emailField: 's11_assignedToEmail', submitField: 'isStep12Submitted' }
  ];

  const pendingActionLeads = leads.filter(l => {
    let currentStep = SEQUENCE.find(step => {
      if (step.condition && !step.condition(l)) return false; 
      return !(l as any)[step.submitField];
    });

    if (currentStep) {
      const email = (l as any)[currentStep.emailField];
      return typeof email === 'string' && email.toLowerCase().trim() === normalizedUserEmail;
    }
    return false;
  });

  const assignedLeads = leads.filter(l => 
    [...SEQUENCE.map(s => s.emailField), 'visitedByEmail'].some(field => {
      const val = (l as any)[field];
      return typeof val === 'string' && val.toLowerCase().trim() === normalizedUserEmail;
    })
  );
`;

const regex = /const ASSIGNEE_MAP = \{[\s\S]*?const assignedLeads = [^;]*;/;
if(regex.test(code)) {
  fs.writeFileSync('src/components/Dashboard.tsx', code.replace(regex, replacement.trim()));
  console.log('Successfully replaced logic in Dashboard.');
} else {
  console.log('Failed to find regex match in Dashboard.');
}
