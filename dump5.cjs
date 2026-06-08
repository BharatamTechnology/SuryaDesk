const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(1286, 1310).map((l, i) => (1286+i) + ': ' + l).join('\n'));
