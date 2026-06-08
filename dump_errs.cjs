const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
const errs = [974, 1138, 1283, 1625, 1702, 2875];
for (let line of errs) {
  console.log('--- Around ' + line + ' ---');
  console.log(lines.slice(line - 4, line + 4).join('\n'));
}
