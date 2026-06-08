const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

// The `handleUpdate` lines we fixed have `}, false);` at the end (or `}, true);`).
// The line right after that is `}` which needs to be deleted.
let lines = code.split('\n');

// 1. Basic Info
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('handleUpdate({ isBasicSubmitted: true, updatedAt: new Date() as any }, true);')) {
    if (lines[i+1].includes('}')) lines[i+1] = ''; // remove extra }
  }
  if (lines[i].includes('handleUpdate({ isSurveySubmitted: true, updatedAt: new Date() as any }, false);')) {
    if (lines[i+1].includes('}')) lines[i+1] = ''; // remove extra }
  }
  if (lines[i].includes('followUps,')) {
    if (lines[i+8].includes('}, false);') && lines[i+9].includes('}')) lines[i+9] = ''; // remove extra }
  }
  if (lines[i].includes('handleUpdate({ isFinancialsSubmitted: true, updatedAt: new Date() as any }, false);')) {
    if (lines[i+1].includes('}')) lines[i+1] = ''; // remove extra }
  }
  if (lines[i].includes('handleUpdate({ isAccountsSubmitted: true, updatedAt: new Date() as any }, false);')) {
    if (lines[i+1].includes('}')) lines[i+1] = ''; // remove extra }
  }
}

fs.writeFileSync('src/components/LeadDetail.tsx', lines.join('\n'));
