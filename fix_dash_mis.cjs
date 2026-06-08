const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

let fixedSeq = `    { emailField: 'assignedPreSales', nameField: 'assignedPreSalesName', submitField: 'isPreSalesSubmitted', label: 'Pre-Sales', tab: 'pre_sales' },
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
    { emailField: 's9_assignedToEmail', nameField: 's9_assignedTo', submitField: 'isStep12Submitted', label: 'Step 13: Loan Final', tab: 'execution', stepId: 12 },
    { emailField: 's11_assignedToEmail', nameField: 's11_assignedTo', submitField: 'isStep13Submitted', label: 'Step 14: Subsidy', tab: 'execution', stepId: 13 },
    { emailField: 'projectInchargeEmail', nameField: 'projectInchargeName', submitField: 'isExecutionSubmitted', label: 'Final Execution Review', tab: 'project_incharge' }`;

let startIdx = code.indexOf('const SEQUENCE = [');
if (startIdx !== -1) {
  let endIdx = code.indexOf('  ];', startIdx);
  if (endIdx !== -1) {
    code = code.substring(0, startIdx + 'const SEQUENCE = [\n'.length) + fixedSeq + '\n' + code.substring(endIdx);
  }
}

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log('Fixed Dashboard sequence');

let misCode = fs.readFileSync('src/components/MISReport.tsx', 'utf8');

let fixedMisSeq = `    { emailField: 'projectAssigneeEmail', nameField: 'projectAssignee', submitField: 'isFinancialsSubmitted', label: 'Section D: Project Details', tab: 'financials', key: 'financials' },
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
    { emailField: 's9_assignedToEmail', nameField: 's9_assignedTo', submitField: 'isStep12Submitted', label: 'Step 13: Loan Final', tab: 'execution', stepId: 12, key: '12' },
    { emailField: 's11_assignedToEmail', nameField: 's11_assignedTo', submitField: 'isStep13Submitted', label: 'Step 14: Subsidy', tab: 'execution', stepId: 13, key: '13' },
    { emailField: 'projectInchargeEmail', nameField: 'projectInchargeName', submitField: 'isExecutionSubmitted', label: 'Final Execution Review', tab: 'project_incharge', key: 'execution_start' }`;

let msId = misCode.indexOf("    { emailField: 'projectAssigneeEmail', nameField: 'projectAssignee', submitField: 'isFinancialsSubmitted', label: 'Section D: Project Details', tab: 'financials', key: 'financials' },");
if (msId !== -1) {
  let endMsId = misCode.indexOf('  ];', msId);
  if (endMsId !== -1) {
    misCode = misCode.substring(0, msId) + fixedMisSeq + '\n' + misCode.substring(endMsId);
  }
}

fs.writeFileSync('src/components/MISReport.tsx', misCode);
console.log('Fixed MISReport sequence');
