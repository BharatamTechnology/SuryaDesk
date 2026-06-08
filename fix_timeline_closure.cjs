const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf8');

let findStr = `    </div>

        {activeTab === "timeline" && (`;

let replaceStr = `    </div>
  )}

        {activeTab === "timeline" && (`;

code = code.replace(findStr, replaceStr);

fs.writeFileSync('src/components/LeadDetail.tsx', code);
console.log('Fixed execution tag closure!');
