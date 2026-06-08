const fs = require("fs");
const path = require("path");

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let original = content;

  content = content.replace(/bg-slate-900 text-white/g, "bg-amber-500 text-slate-950");
  content = content.replace(/bg-slate-900 border-slate-900 text-white/g, "bg-amber-500 border-amber-500 text-slate-950");
  content = content.replace(/hover:bg-slate-800/g, "hover:bg-amber-400");
  content = content.replace(/hover:bg-slate-900 hover:text-white/g, "hover:bg-amber-500 hover:text-slate-950");
  content = content.replace(/hover:bg-slate-900/g, "hover:bg-amber-500");
  content = content.replace(/shadow-slate-900/g, "shadow-amber-500");
  // For the active sidebar menus in App.tsx:
  content = content.replace(/bg-white\/10 text-white/g, "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20");

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
