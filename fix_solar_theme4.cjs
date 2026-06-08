const fs = require("fs");
const path = require("path");

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let original = content;

  content = content.replace(/bg-emerald-500 border-amber-500/g, "bg-emerald-500 border-emerald-500");
  content = content.replace(/bg-emerald-500 border-amber-400/g, "bg-emerald-500 border-emerald-400");
  content = content.replace(/bg-emerald-500 text-slate-950/g, "bg-emerald-500 text-white");
  content = content.replace(/hover:bg-amber-400/g, "hover:bg-emerald-400");
  // The sidebar active menu should keep white text and emerald bg. But let's apply a nicer gradient for it if not already?
  // Let's re-verify Dashboard.tsx for "text-slate-950"
  
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
