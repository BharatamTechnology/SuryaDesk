const fs = require("fs");
const path = require("path");

const PRIMARY_BG = "bg-emerald-500 text-white";
const PRIMARY_HOVER = "hover:bg-emerald-400";
const SIDEBAR_ACTIVE = "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/25";

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let original = content;

  content = content.replace(/bg-amber-500 text-slate-950 shadow-md shadow-amber-500\/20/g, SIDEBAR_ACTIVE);
  content = content.replace(/bg-amber-500 hover:bg-amber-400 text-slate-950/g, `bg-emerald-500 hover:bg-emerald-400 text-white`);
  content = content.replace(/bg-amber-500 hover:bg-amber-400/g, `bg-emerald-500 hover:bg-emerald-400`);
  content = content.replace(/bg-amber-500 text-slate-950/g, `bg-emerald-500 text-white`);
  content = content.replace(/bg-amber-500/g, `bg-emerald-500`);
  
  content = content.replace(/shadow-amber-500/g, "shadow-emerald-500");

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
