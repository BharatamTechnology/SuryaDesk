const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(1276, 1316).map((l, i) => (1276+i) + ': ' + l).join('\n'));
