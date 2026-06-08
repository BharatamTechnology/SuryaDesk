const fs = require("fs");
const path = require("path");

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let original = content;

  // Since tailwind utility classes can be in any order, a regex isn't perfect, but we can do our best
  content = content.replace(/bg-slate-900([^"]*)text-white/g, "bg-amber-500$1text-slate-950");
  
  // also some buttons might just be `bg-slate-900`
  content = content.replace(/"w-full py-3 px-4 bg-slate-900 /g, '"w-full py-3 px-4 bg-amber-500 ');
  content = content.replace(/bg-slate-900 hover:bg-amber-400/g, "bg-amber-500 hover:bg-amber-400");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("Updated: " + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (!full.includes("node_modules")) walk(full);
    } else if (full.endsWith(".tsx")) {
      replaceInFile(full);
    }
  }
}

walk("./src");
