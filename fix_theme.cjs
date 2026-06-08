const fs = require('fs');
const path = require('path');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace active sidebar
  content = content.replace(/bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500\/25/g, 'bg-zinc-800 text-white shadow-md border border-white/5');
  
  // Replace the big generic buttons
  content = content.replace(/bg-emerald-500 hover:bg-emerald-400 text-white/g, 'bg-zinc-900 hover:bg-zinc-800 text-white');
  content = content.replace(/bg-emerald-500 text-white hover:bg-emerald-400/g, 'bg-zinc-900 text-white hover:bg-zinc-800');
  content = content.replace(/bg-emerald-500 hover:bg-emerald-400/g, 'bg-zinc-900 hover:bg-zinc-800 text-white');

  // Any remaining generic button replacements that were explicitly replaced
  // We'll leave alone single bg-emerald-500 to avoid breaking status indicators!
  
  // Also fix up Dashboard buttons
  content = content.replace(/hover:bg-emerald-500 hover:text-white/g, 'hover:bg-zinc-900 hover:text-white');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed ', file);
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!full.includes('node_modules')) walk(full);
    } else if (full.endsWith('.tsx')) {
      processFile(full);
    }
  }
}
walk('./src');
