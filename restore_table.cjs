const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf8');

// I will find where the first array is defined, and where the FIRST `].filter` should be terminating.
const mapBlockStart = code.indexOf('<tbody className="divide-y divide-slate-50">');
// Since I appended the entire code ending in `.map((step) => {` from the *button* (because of `endIdx`), my first array definition is followed immediately by the button render.
// I will replace everything from `<tbody className="divide-y divide-slate-50">` up to `{/* Execution Workspace */}`.

const newTableBlock = `<tbody className="divide-y divide-slate-50">
                  {[
                    { id: 14, label: "New Connection", emailField: 's_newConn_assignedToEmail', nameField: 's_newConn_assignedTo', icon: PlusCircle, condition: lead.newConnectionRequired === 'Yes', desc: "New Connection Details", requiredField: 'newConnectionRequired' },
                    { id: 1, label: "Doc Correction", emailField: 's_docCorr_assignedToEmail', nameField: 's_docCorr_assignedTo', icon: FileCheck, condition: lead.s_docCorr_required === 'Yes', desc: "Document Audit", requiredField: 's_docCorr_required' },
                    { id: 2, label: "Load Extension", emailField: 's_loadExt_assignedToEmail', nameField: 's_loadExt_assignedTo', icon: Zap, condition: lead.loadExtensionRequired === 'Yes', desc: "Load Protocol", requiredField: 'loadExtensionRequired' },
                    { id: 3, label: "Online Registration", emailField: 'execution_assignedToEmail', nameField: 'execution_assignedTo', icon: ExternalLink, desc: "Onboarding" },
                    { id: 4, label: "Loan Processing", emailField: 's4_loanAssignedToEmail', nameField: 's4_loanAssignedTo', icon: CreditCard, condition: lead.loanRequired === 'Yes', desc: "Financial Sync", requiredField: 'loanRequired' },
                    { id: 5, label: "Meter Dispatch", emailField: 's5_storeDispatchAssignedToEmail', nameField: 's5_storeDispatchAssignedTo', icon: HardDrive, desc: "Logistics" },
                    { id: 6, label: "DISCOM (Pre-Install)", emailField: 's5_discomPreAssignedToEmail', nameField: 's5_discomPreAssignedTo', icon: Zap, desc: "Utility Sync" },
                    { id: 7, label: "SITE INCHARGE", emailField: 's6_inchargeAssignedToEmail', nameField: 's6_inchargeAssignedTo', icon: MapPin, desc: "Field Control" },
                    { id: 8, label: "STORE INCHARGE", emailField: 's5_storeInchargeAssignedToEmail', nameField: 's5_storeInchargeAssignedTo', icon: HardDrive, desc: "Custodian" },
                    { id: 9, label: "SITE TEAM", emailField: 's6_assignedToEmail', nameField: 's6_assignedTo', icon: Users, desc: "Installation" },
                    { id: 10, label: "OFFICE EXEC (Post)", emailField: 's7_assignedToEmail', nameField: 's7_assignedTo', icon: FileCheck, desc: "Post-Install" },
                    { id: 11, label: "DISCOM (Post-Install)", emailField: 's8_assignedToEmail', nameField: 's8_assignedTo', icon: Zap, desc: "Utility Closure" },
                    { id: 12, label: "LOAN OFFICER (Post)", emailField: 's9_assignedToEmail', nameField: 's9_assignedTo', icon: CreditCard, desc: "Final Audit" },
                    { id: 13, label: "SUBSIDY SECTION", emailField: 's11_assignedToEmail', nameField: 's11_assignedTo', icon: FileText, desc: "Incentives" }
                  ].filter(step => step.condition !== false).map((step, index) => {
                    const isCompleted = (lead as any)[\`isStep\${step.id}Submitted\`];
                    const assigneeName = (lead as any)[step.nameField] || "";
                    const isRequired = step.requiredField ? (lead as any)[step.requiredField] : 'Yes';
                    const dueDateValue = lead.stepDueDates?.[step.id] || "";
                    const remarkValue = (lead as any)[\`step\${step.id}Remark\`] || "";

                    const status = isRequired === 'No' 
                      ? 'Bypassed' 
                      : (isCompleted ? 'Completed' : (assigneeName ? 'Assigned' : 'Unassigned'));

                    let rowBg = "hover:bg-slate-50/50";
                    let rowBorderLeft = "border-l-4 border-l-transparent";

                    if (status === 'Bypassed') {
                      rowBg = "bg-slate-50/30 opacity-60 hover:bg-slate-50/50";
                      rowBorderLeft = "border-l-4 border-l-slate-300";
                    }

                    return (
                      <tr key={step.id} className={\`group transition-all duration-300 \${rowBg} \${rowBorderLeft}\`}>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={\`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shadow-sm \${
                              status === 'Completed' ? 'bg-emerald-500 text-white' : 
                              status === 'Assigned' ? 'bg-amber-400 text-amber-950 font-black' : 
                              status === 'Unassigned' ? 'bg-rose-500 text-white animate-pulse' :
                              'bg-slate-200 text-slate-400'
                            }\`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-none mb-1">{step.label}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{step.desc}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          {step.requiredField ? (
                            <div className="flex items-center gap-2">
                              <span className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border \${
                                isRequired === 'Yes' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }\`}>
                                {isRequired === 'Yes' ? 'Required' : 'Bypassed'}
                              </span>
                              <button 
                                onClick={() => handleUpdate({ [step.requiredField as string]: isRequired === 'Yes' ? 'No' : 'Yes' })}
                                disabled={isCompleted || (!isAdminUser && !isSteward)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Toggle Requirement"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Mandatory
                            </span>
                          )}
                        </td>

                        <td className="px-8 py-5 min-w-[200px]">
                          {isRequired === 'Yes' ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className={\`w-6 h-6 rounded-lg flex items-center justify-center \${assigneeName ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}\`}>
                                  {step.icon ? <step.icon className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-xs font-bold text-slate-900">{assigneeName || 'Unassigned'}</span>
                              </div>
                              {assigneeName && (
                                <span className="text-[9px] text-slate-400 font-medium ml-8">{((lead as any)[step.emailField || ''] || '')}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 italic">Skipped</span>
                          )}
                        </td>

                        <td className="px-8 py-5">
                          {isRequired === 'Yes' ? (
                            <input 
                              type="date"
                              value={dueDateValue || ""}
                              onChange={(e) => {
                                const dueDates = { ...(lead.stepDueDates || {}) };
                                dueDates[step.id] = e.target.value;
                                handleUpdate({ stepDueDates: dueDates });
                              }}
                              disabled={isCompleted || !canEditTab('project_incharge')}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all disabled:opacity-50"
                            />
                          ) : (
                            <div className="h-px w-8 bg-slate-200" />
                          )}
                        </td>

                        <td className="px-8 py-5">
                          <input 
                            value={remarkValue || ""}
                            onChange={(e) => handleUpdate({ [\`step\${step.id}Remark\`]: e.target.value })}
                            onBlur={(e) => handleUpdate({ [\`step\${step.id}Remark\`]: e.target.value })}
                            placeholder="Enter directive..."
                            disabled={isCompleted || !canEditTab('project_incharge')}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all disabled:opacity-50"
                          />
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex justify-center">
                            {isCompleted ? (
                              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            ) : isRequired === 'Yes' ? (
                              <button 
                                onClick={() => handleAssignment(step.id, step.nameField, step.emailField || "", assigneeName)}
                                disabled={!assigneeName || !canEditTab('project_incharge')}
                                className="w-8 h-8 bg-zinc-900 text-white rounded-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center shadow-lg shadow-slate-950/20"
                                title="Activate Assignment"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                   handleUpdate({
                                      [\`isStep\${step.id}Submitted\`]: true,
                                      [\`step\${step.id}Status\`]: 'Bypassed',
                                      [\`step\${step.id}Remark\`]: 'Marked as Not Required by In-charge',
                                      updatedAt: new Date()
                                   });
                                }}
                                disabled={isCompleted || !canEditTab('project_incharge')}
                                className="w-8 h-8 bg-slate-100 text-slate-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center"
                                title="Bypass Protocol"
                              >
                                <FileCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>`;

let endWsIdx = code.indexOf('{/* Execution Workspace */}');
if (mapBlockStart !== -1 && endWsIdx !== -1) {
   let wsLine = code.lastIndexOf('</div>\n\n            {/* Execution Workspace */}');
   if (wsLine === -1) wsLine = code.lastIndexOf('</div>\n            {/* Execution Workspace */}');
   if (wsLine !== -1) {
       code = code.substring(0, mapBlockStart) + newTableBlock + code.substring(endWsIdx - 25);
   }
}

// Now replace the "Operational Lifecycle" loop to use `index + 1` instead of `step.id` for display!
let optMapStartStr = `].filter(step => step.condition !== false).map((step) => {
                  const isCompleted = (lead as any)[\`isStep\${step.id}Submitted\`];
                  const isActive = currentExecutionStep === step.id;`;

let optMapRepStr = `].filter(step => step.condition !== false).map((step, index) => {
                  const isCompleted = (lead as any)[\`isStep\${step.id}Submitted\`];
                  const isActive = currentExecutionStep === step.id;`;

code = code.replace(optMapStartStr, optMapRepStr);
code = code.replace('{isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}', '{isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : (index + 1)}');

// Fix JSX error: The character "}" is not valid inside a JSX element
// Line 4839: `)}`
// Let's remove any floating `)}` around line 4839.
// And `Expected ")" but found "{"` line 5082.

fs.writeFileSync('src/components/LeadDetail.tsx', code);
console.log('Restored table block');
