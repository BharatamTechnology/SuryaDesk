const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

const replacement = `    if (stepId === 1) {
      if (!lead.s3_onlineRegistrationDone || lead.s3_onlineRegistrationDone === "" || !lead.execution_assignedTo || lead.execution_assignedTo === "" || !lead.s3_aenOfficeName || lead.s3_aenOfficeName === "") {
        showNotification("Please fill mandatory fields: AEN Office Name, Online Registration and Assign To", "warning");
        return;
      }
      if (lead.loadExtensionRequired === 'Yes' && (!lead.s3_loadExtFileUrl || lead.s3_loadExtFileUrl === "")) {
        showNotification("Please upload Load Extension File (Required)", "warning");
        return;
      }
      if (lead.loanRequired === 'Yes' && !lead.s4_loanAssignedTo) {
        showNotification("Please select Assignee for Step 2: Loan Process", "warning");
        return;
      }
      if (lead.loanRequired !== 'Yes' && !lead.s5_storeDispatchAssignedTo) {
        showNotification("Please select Assignee for Step 3: Meter Dispatch", "warning");
        return;
      }
    }`;

const regex = /if \(stepId === 1\) \{\s*if \(!lead\.s3_onlineRegistrationDone[\s\S]*?return;\s*\}\s*\}/;

if(regex.test(code)) {
  fs.writeFileSync('src/components/LeadDetail.tsx', code.replace(regex, replacement));
  console.log('Successfully updated step 1 validation in LeadDetail.tsx.');
} else {
  console.log('Failed to find regex match in step 1 validation.');
}
