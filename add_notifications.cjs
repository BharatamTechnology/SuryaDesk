const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('import NotificationsDropdown')) {
  code = code.replace(/import \{ Search, Plus, [\s\S]*?\} from "lucide-react";/, (match) => {
    return match + "\nimport NotificationsDropdown from './components/NotificationsDropdown';";
  });
  
  const targetHtml = `<button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden">
              <Search className="w-5 h-5" />
            </button>`;
  
  const newHtml = `<button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden">
              <Search className="w-5 h-5" />
            </button>
            <NotificationsDropdown userEmail={user?.email} onNavigateToLead={(id) => { setActiveTab('dashboard'); setSelectedLeadId(id); }} />`;
            
  code = code.replace(targetHtml, newHtml);
  
  fs.writeFileSync('src/App.tsx', code);
  console.log('Added notifications to App.tsx');
}
