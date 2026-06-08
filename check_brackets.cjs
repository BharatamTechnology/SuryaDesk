const fs = require('fs');
const code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

let indent = 0;
for(let i=0; i<code.length; i++) {
  if (code[i] === '{') indent++;
  if (code[i] === '}') indent--;
  if (indent < 0) {
    console.log("Negative indent at index", i);
    console.log("Around string:", code.substring(i-50, i+50));
    break;
  }
}
console.log("Final indent:", indent);
