const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(960, 990).join('\n'));
