const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

const replacement = `    const submittedField = \`isStep\${stepId}Submitted\`;
    const extraUpdates: any = {};

    if (stepId === 1 && lead.loanRequired !== 'Yes') {
      extraUpdates.isStep2Submitted = true;
    }

    await handleUpdate({ 
      updatedAt: new Date() as any,
      [submittedField]: true,
      ...extraUpdates
    });`;

const regex = /const submittedField = `isStep\$\{stepId\}Submitted`;\s*await handleUpdate\(\{ \s*updatedAt: new Date\(\) as any,\s*\[submittedField\]: true\s*\}\);/;

if(regex.test(code)) {
  fs.writeFileSync('src/components/LeadDetail.tsx', code.replace(regex, replacement));
  console.log('Successfully updated handleStepUpdate in LeadDetail.tsx.');
} else {
  console.log('Failed to find regex match in handleStepUpdate.');
}
