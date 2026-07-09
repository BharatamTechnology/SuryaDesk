const fs = require('fs');
let content = fs.readFileSync('src/components/LeadDetail.tsx', 'utf8');
const lines = content.split('\n');

const extractedLines = lines.slice(9189, 9472).join('\n');
const startPart = lines.slice(0, 9189).join('\n');
const endPart = lines.slice(9472).join('\n');

content = startPart + '\n' + endPart;

const tabContent = `
          {activeTab === "final_review" && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display tracking-tight text-slate-900">
                    Final Execution Review
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Approve project execution after deliverables are submitted
                  </p>
                </div>
              </div>
              
              {!isExecutionFlowFinished ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center shadow-inner">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">Execution in Progress</p>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                      The project execution milestones are not yet completed. This section will unlock once the execution workflow is finished.
                    </p>
                  </div>
                </div>
              ) : (
                <>
${extractedLines}
                </>
              )}
            </div>
          )}
`;

content = content.replace('{activeTab === "documents" && (', tabContent + '          {activeTab === "documents" && (');

fs.writeFileSync('src/components/LeadDetail.tsx', content);
console.log('Update complete.');
