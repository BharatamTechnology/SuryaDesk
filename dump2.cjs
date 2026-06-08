const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
console.log(lines.slice(1280, 1315).join('\n'));
