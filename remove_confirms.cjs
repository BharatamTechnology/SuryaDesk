const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

// Replace delete confirmation
code = code.replace(/if \(!window\.confirm\("Are you sure you want to delete this lead\?"\)\) return;/g, '');

// Replace section A confirmation
code = code.replace(/if \(window\.confirm\("Submit Section A\? This will lock it and notify the surveyor\."\)\) \{([\s\S]*?)\}/g, '$1');

// Replace Survey confirmation
code = code.replace(/if \(window\.confirm\("Submit Survey\? This will lock the section and enable Sales\."\)\) \{([\s\S]*?)\}/g, '$1');

// Replace Sales confirmation
code = code.replace(/if \(window\.confirm\(confirmMsg\)\) \{([\s\S]*?)\}/g, '$1');

// Replace Financials confirmation
code = code.replace(/if \(window\.confirm\("Submit Financials\? This will lock the section and move to Accounts\."\)\) \{([\s\S]*?)\}/g, '$1');

// Replace Accounts confirmation
code = code.replace(/if \(window\.confirm\("Confirm Payment\? This will lock Accounts and move to Execution\."\)\) \{([\s\S]*?)\}/g, '$1');

// Replace Lock all execution steps confirmation
code = code.replace(/if \(window\.confirm\("Are you sure you want to lock all execution steps\?"\)\) \{([\s\S]*?)\}/g, '$1');

fs.writeFileSync('src/components/LeadDetail.tsx', code);
console.log('Removed all window.confirms');
