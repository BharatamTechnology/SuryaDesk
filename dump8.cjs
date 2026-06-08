const fs = require('fs');
const lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');

// Find onClick={ for Sales interaction
let buttonIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Confirm Lost')) {
    buttonIndex = i;
    break;
  }
}

// Search backward for onClick
let onClickStart = -1;
for (let i = buttonIndex; i >= 0; i--) {
  if (lines[i].includes('onClick={')) {
    onClickStart = i;
    break;
  }
}

console.log("Start block:", onClickStart, "-", buttonIndex);
console.log(lines.slice(onClickStart-2, buttonIndex + 5).map((l, i) => (onClickStart-2+i) + ': ' + l).join('\n'));
