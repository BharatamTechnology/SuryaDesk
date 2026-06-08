const fs = require('fs');

function repl(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(file, content);
}

// CommissionManagement.tsx
let f = 'src/components/CommissionManagement.tsx';
let txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/bg-emerald-500 rounded-xl text-slate-950/g, 'bg-zinc-900 rounded-xl text-white');
txt = txt.replace(/bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500\/20/g, 'bg-zinc-900 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-zinc-900/20');
txt = txt.replace(/bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950/g, 'bg-zinc-900 rounded-2xl flex items-center justify-center text-white');
txt = txt.replace(/bg-emerald-500 rounded-\[2rem\] text-slate-950/g, 'bg-zinc-900 rounded-[2rem] text-white');
txt = txt.replace(/bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800');
fs.writeFileSync(f, txt);

// Dashboard.tsx
f = 'src/components/Dashboard.tsx';
txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/hover:bg-emerald-500 hover:text-slate-950/g, 'hover:bg-zinc-900 hover:text-white');
txt = txt.replace(/bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-zinc-800');
txt = txt.replace(/bg-emerald-500 text-slate-950 scale-110 shadow-lg/g, 'bg-zinc-900 text-white scale-110 shadow-lg');
txt = txt.replace(/bg-emerald-500 text-slate-950 shadow-md/g, 'bg-zinc-900 text-white shadow-md');
fs.writeFileSync(f, txt);

// LeadDetail.tsx
f = 'src/components/LeadDetail.tsx';
txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/bg-emerald-500 text-white rounded-xl font-semibold/g, 'bg-zinc-900 text-white rounded-xl font-semibold');
txt = txt.replace(/bg-emerald-500 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-800');
txt = txt.replace(/bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800');
txt = txt.replace(/bg-emerald-500 text-white rounded-xl hover:bg-blue-600/g, 'bg-zinc-900 text-white rounded-xl hover:bg-blue-600');
txt = txt.replace(/bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm">5/g, 'bg-zinc-900 flex items-center justify-center text-white font-bold text-sm">5');
fs.writeFileSync(f, txt);

// PaymentManagement.tsx
f = 'src/components/PaymentManagement.tsx';
txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/bg-emerald-500 text-white shrink-0/g, 'bg-emerald-500 text-white shrink-0'); // wait this might be actual emerald? Let's leave it.
txt = txt.replace(/hover:bg-emerald-500 hover:shadow-lg focus:ring-4/g, 'hover:bg-zinc-900 hover:shadow-lg focus:ring-4');
fs.writeFileSync(f, txt);

// ServiceManagement.tsx
f = 'src/components/ServiceManagement.tsx';
txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-zinc-800');
txt = txt.replace(/bg-emerald-500 text-white rounded-xl text-\[10px\] font-black uppercase tracking-widest hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800');
txt = txt.replace(/bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-\[0\.2em\] text-xs hover:bg-emerald-400/g, 'bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-800');
fs.writeFileSync(f, txt);

// TaskSheet.tsx
f = 'src/components/TaskSheet.tsx';
txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/hover:bg-emerald-500/g, 'hover:bg-zinc-900');
fs.writeFileSync(f, txt);

// UserManagement.tsx
f = 'src/components/UserManagement.tsx';
txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/group-hover:bg-emerald-500/g, 'group-hover:bg-zinc-900');
fs.writeFileSync(f, txt);

console.log('Targeted theme revert applied.');
