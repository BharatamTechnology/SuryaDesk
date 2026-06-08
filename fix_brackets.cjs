const fs = require('fs');
let lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');

for(let i=0; i<lines.length; i++) {
  if (lines[i] === '                      } else {') {
    console.log("Found else at line", i);
  }
}
