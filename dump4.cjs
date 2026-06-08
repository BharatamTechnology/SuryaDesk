const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(3140, 3150).map((l, i) => (3140+i) + ': ' + l).join('\n'));
console.log(lines.slice(3185, 3195).map((l, i) => (3185+i) + ': ' + l).join('\n'));
