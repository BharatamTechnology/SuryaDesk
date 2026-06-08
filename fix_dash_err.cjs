const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const replacement = `  const assignedLeads = leads.filter(l => 
    [...SEQUENCE.map(s => s.emailField), 'visitedByEmail'].some(field => {
      const val = (l as any)[field];
      return typeof val === 'string' && val.toLowerCase().trim() === normalizedUserEmail;
    })
  );`;

// We'll replace the malformed assignedLeads with exactly one correct version
const brokenAssignedLeadsRegex = /const assignedLeads = leads\.filter\(l =>[\s\S]*?\n\s*\);[\s\S]*?\n\s*\);/;

if(brokenAssignedLeadsRegex.test(code)) {
  fs.writeFileSync('src/components/Dashboard.tsx', code.replace(brokenAssignedLeadsRegex, replacement));
  console.log('Fixed syntax error in Dashboard.tsx');
} else {
  console.log('Failed to find regex match in Dashboard.tsx to fix syntax error.');
  // Backup: find anything that looks like const assignedLeads = ... and replace down to 88
}
