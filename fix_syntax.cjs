const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

code = code.replace(/handleUpdate\(\{ isBasicSubmitted: true, updatedAt: new Date\(\) as any , true\);\n                    \}/g, `handleUpdate({ isBasicSubmitted: true, updatedAt: new Date() as any }, true);`);

code = code.replace(/handleUpdate\(\{ isSurveySubmitted: true, updatedAt: new Date\(\) as any \}, true\);\n                    \}/g, `handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any }, true);`);
// Wait, for survey it was:
// handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any }, true);
code = code.replace(/handleUpdate\(\{ isSurveySubmitted: true, updatedAt: new Date\(\) as any , true\);\n                    \}/g, `handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any }, true);`);

// For sales
code = code.replace(/handleUpdate\(\{ isSalesSubmitted: true, updatedAt: new Date\(\) as any , true\);\n                      \}/g, `handleUpdate({ isSalesSubmitted: true, updatedAt: new Date() as any }, true);`);

// For Financials
code = code.replace(/handleUpdate\(\{ isFinancialsSubmitted: true, updatedAt: new Date\(\) as any , true\);\n                    \}/g, `handleUpdate({ isFinancialsSubmitted: true, updatedAt: new Date() as any }, true);`);

// For Accounts
code = code.replace(/handleUpdate\(\{ isAccountsSubmitted: true, updatedAt: new Date\(\) as any , true\);\n                    \}/g, `handleUpdate({ isAccountsSubmitted: true, updatedAt: new Date() as any }, true);`);

// For Execution lock all
code = code.replace(/let updates: any = \{\n                      updatedAt: new Date\(\) as any\n                   , true\);\n                      /g, `let updates: any = {\n                      updatedAt: new Date() as any\n                    };\n`);

// Wait, let's just make sure we capture all of them.
// Let me write a more robust fixer using a replacer function if needed, but first let me see the exact strings.
fs.writeFileSync('src/components/LeadDetail.tsx.tmp', code);
