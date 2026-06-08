const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(1270, 1310).map((l, i) => (1270+i) + ': ' + l).join('\n'));
