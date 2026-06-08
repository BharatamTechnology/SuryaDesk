const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf8');

let findStr = '                </tbody>\n              </table>\n            </div>';
let pIdx = code.indexOf(findStr);

if (pIdx !== -1) {
   let wsIdx = code.indexOf('{/* Execution Workspace */}', pIdx);
   if (wsIdx !== -1) {
       let replacement = `                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )}

  {activeTab === "execution" && (
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Execution Steps Sidebar */}
        <div className="w-full lg:w-64 shrink-0 bg-white border border-slate-100 rounded-3xl p-4 shadow-xl shadow-slate-200/40 lg:sticky top-6 z-10 overflow-x-auto lg:overflow-visible">
          <div className="mb-4 pb-4 border-b border-slate-100 flex items-center justify-between min-w-max pr-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none">Operational Lifecycle</p>
              </div>
            </div>
          </div>
          
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar">
            {[
              { id: 14, label: "New Connection", condition: lead.newConnectionRequired === 'Yes' },
              { id: 1, label: "Doc Correction", condition: lead.s_docCorr_required === 'Yes' },
              { id: 2, label: "Load Extension", condition: lead.loadExtensionRequired === 'Yes' },
              { id: 3, label: "Online Registration" },
              { id: 4, label: "Loan Processing", condition: lead.loanRequired === 'Yes' },
              { id: 5, label: "Meter Dispatch" },
              { id: 6, label: "DISCOM (Pre-Install)" },
              { id: 7, label: "SITE INCHARGE" },
              { id: 8, label: "STORE INCHARGE" },
              { id: 9, label: "SITE TEAM" },
              { id: 10, label: "OFFICE EXEC (Post-Install)" },
              { id: 11, label: "DISCOM (Post-Install)" },
              { id: 12, label: "LOAN OFFICER (Post-Install)" },
              { id: 13, label: "SUBSIDY SECTION" }
            ].filter(step => step.condition !== false).map((step, index) => {
              const isCompleted = (lead as any)[\`isStep\${step.id}Submitted\`];
              const isActive = currentExecutionStep === step.id;
              const isActionAssigned = shouldHighlightStep(step.id);
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentExecutionStep(step.id)}
                  className={\`flex lg:w-full items-center gap-2 p-2.5 rounded-xl transition-all border text-left group relative shrink-0 \${
                    isActive 
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg' 
                      : isCompleted 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }\`}
                >
                  <div className={\`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-[9px] transition-colors \${
                    isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-slate-200'
                  }\`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : (index + 1)}
                  </div>
                  <div className="min-w-0 pr-4">
                    <p className="text-[11px] font-bold truncate leading-tight">{step.label}</p>
                  </div>

                  {isActive && (
                    <motion.div layoutId="activeStepIndicator" className="absolute -left-1 w-1.5 h-6 bg-blue-500 rounded-full hidden lg:block" />
                  )}

                  {isActionAssigned && !isCompleted && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Execution Workspace */}`;
       code = code.substring(0, pIdx) + replacement + code.substring(wsIdx + '{/* Execution Workspace */}'.length);
   }
}

// Ensure the closing tags are correct for the newly added Sidebar.
// There is an unexpected `)}` near 4947!
let brokenEndStr = `    </div>
  )}

        {activeTab === "timeline" && (`;
let fixedEndStr = `    </div>

        {activeTab === "timeline" && (`;
code = code.replace(brokenEndStr, fixedEndStr);

fs.writeFileSync('src/components/LeadDetail.tsx', code);
console.log('Fixed!');
