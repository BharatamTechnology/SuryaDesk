const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

function fixOnClick(buttonTextStart, replaceOnClick) {
  // Find the button inner text to locate the button
  const buttonIndex = code.indexOf(buttonTextStart);
  if (buttonIndex === -1) {
    console.log("Could not find button text: ", buttonTextStart);
    return;
  }
  
  // Find the onClick backwards
  const onClickStart = code.lastIndexOf('onClick={() => {', buttonIndex);
  if (onClickStart === -1) return;

  // Find the matching `}}` for onClick
  let indent = 0;
  let onClickEnd = -1;
  for(let i=onClickStart + 'onClick={'.length; i<code.length; i++) {
    if (code[i] === '{') indent++;
    if (code[i] === '}') indent--;
    if (indent === 0) {
      onClickEnd = i;
      break;
    }
  }

  code = code.substring(0, onClickStart) + replaceOnClick + code.substring(onClickEnd + 1);
}

// Basic Info
fixOnClick('>Submit Basic Info', "onClick={() => {\n  if (!lead.customerName || !lead.mobileNumber || !lead.address || !lead.requiredKw || !lead.assignedToName || !lead.plan || !lead.siteVisitDate) {\n    showNotification(\"Please fill all the fields\", \"warning\");\n    return;\n  }\n  handleUpdate({ isBasicSubmitted: true, updatedAt: new Date() as any }, true);\n}}");

// Survey
fixOnClick('>Submit Site Survey', "onClick={() => {\n  if (!lead.phase || !lead.finalKw || !lead.connectionType || !lead.dcrType || !lead.stdPackage) {\n    showNotification(\"Please fill all the fields\", \"warning\");\n    return;\n  }\n  handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any }, false);\n}}");

// Sales & Status
fixOnClick('Confirm Lost\' : \'Submit Interaction\'', "onClick={() => {\n  if (!lead.status || !lead.salesRemark) {\n    showNotification(\"Please fill status and remark\", \"warning\");\n    return;\n  }\n  if (lead.status === 'Follow up' && !lead.nextFollowUpDate) {\n    showNotification(\"Please provide next follow up date\", \"warning\");\n    return;\n  }\n\n  const newFollowUp = {\n    remark: lead.salesRemark,\n    nextFollowUpDate: lead.nextFollowUpDate || null,\n    status: lead.status,\n    date: new Date().toISOString(),\n    timestamp: new Date()\n  } as any;\n\n  const followUps = [...(lead.followUps || []), newFollowUp];\n  const isFinal = lead.status === 'Won' || lead.status === 'Lost';\n  \n  handleUpdate({ \n    followUps,\n    isSalesSubmitted: isFinal,\n    updatedAt: new Date() as any,\n    ...(isFinal ? {} : { salesRemark: '', nextFollowUpDate: '' })\n  }, false);\n}}");

// Financials
fixOnClick('>Submit Financial Details', "onClick={() => {\n  if (!lead.baseAmount) {\n    showNotification(\"Please check auto-calculated amount\", \"warning\");\n    return;\n  }\n  if (lead.loanRequired === 'Yes' && (!lead.loanBank || !lead.loanAmountRecv || !lead.loanAmountDate || !lead.loanAmountRef)) {\n    showNotification(\"Please fill all loan details\", \"warning\");\n    return;\n  }\n  handleUpdate({ isFinancialsSubmitted: true, updatedAt: new Date() as any }, false);\n}}");

// Accounts
fixOnClick('>Submit Payment Status', "onClick={() => {\n  if (!lead.accPaymentStatus) {\n    showNotification(\"Please select payment status\", \"warning\");\n    return;\n  }\n  if (lead.accPaymentStatus === 'Confirmed' && (!lead.accAmount || !lead.accUtrNo || !lead.accDate || lead.accAmount === 0)) {\n    showNotification(\"Please fill all payment details to confirm\", \"warning\");\n    return;\n  }\n  let updates: any = {\n    isAccountsSubmitted: true,\n    updatedAt: new Date() as any\n  };\n  // If payment is pending/rejected, optionally don't lock yet.\n  // For now, if they click submit, we lock it.\n  handleUpdate(updates, false);\n}}");

// Lock all Execution steps
fixOnClick('>Lock Project Execution', "onClick={() => {\n  handleUpdate({ isExecutionSubmitted: true, updatedAt: new Date() as any }, false);\n}}");

fs.writeFileSync('src/components/LeadDetail.tsx', code);
console.log('Fixed onClicks');
