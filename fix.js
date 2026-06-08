const fs = require("fs");
const path = "./src/components/LeadDetail.tsx";
let code = fs.readFileSync(path, "utf-8");
code = code.replace(/\?\.toLowerCase\(\)\.trim\(\)/g, "?.toLowerCase()?.trim()");
fs.writeFileSync(path, code);
console.log("Fixed!");
