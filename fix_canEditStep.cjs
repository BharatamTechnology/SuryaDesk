const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

const replacement = `  const canEditStep = useCallback((stepIndex: number) => {
    if (!lead) return false;
    
    // Check if the current step is already submitted
    const submittedField = \`isStep\${stepIndex}Submitted\` as keyof Lead;
    if (lead[submittedField] === true) return false;

    // Sequential Check: Previous step MUST be submitted before this one can be edited
    // (Skip step 2 check if loanRequired !== 'Yes')
    if (stepIndex > 1) {
      if (stepIndex === 3 && lead.loanRequired !== 'Yes') {
        if (!lead.isStep1Submitted) return false;
      } else {
        const prevSubmittedField = \`isStep\${stepIndex - 1}Submitted\` as keyof Lead;
        if (lead[prevSubmittedField] !== true) return false;
      }
    }

    const userEmail = user?.email?.toLowerCase()?.trim();
    if (role === 'Admin' || userEmail === 'hemant.tyagi@bharatamtechnology.com') return true;
    if (!userEmail) return false;

    const email = userEmail;

    if (stepIndex === 1) return (lead.execution_assignedToEmail || '').toLowerCase().trim() === email;`;

const regex = /const canEditStep = useCallback\(\(stepIndex: number\) => \{[\s\S]*?if \(stepIndex === 1\) return [^;]+;/;
if(regex.test(code)) {
  fs.writeFileSync('src/components/LeadDetail.tsx', code.replace(regex, replacement));
  console.log('Successfully updated canEditStep in LeadDetail.tsx.');
} else {
  console.log('Failed to find regex match in canEditStep.');
}
