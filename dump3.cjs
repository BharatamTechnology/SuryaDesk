const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(1280, 1370).map((l, i) => (1280+i) + ': ' + l).join('\n'));
