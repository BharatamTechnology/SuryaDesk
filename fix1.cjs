const fs = require('fs');
let lines = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8').split('\n');
const replacement = `                    onClick={() => {
                      if (!lead.status || !lead.assignedSales || !lead.salesRemark) {
                        showNotification("Please fill Status, Remark & Sales Person", "warning");
                        return;
                      }
                      if ((lead.status === "Under Discussion" || lead.status === "Negotiation") && !lead.nextFollowUpDate) {
                        showNotification("Please select next follow-up date", "warning");
                        return;
                      }
                      if (lead.status === "Lost" && !lead.lostReason) {
                        showNotification("Enter lost reason", "warning");
                        return;
                      }
                      if (lead.status === "Won" && !lead.projectAssignee) {
                        showNotification("Please assign a Project Incharge for the next phase", "warning");
                        return;
                      }

                      const newFollowUp = {
                        date: new Date().toISOString(),
                        status: lead.status,
                        remark: lead.salesRemark,
                        nextFollowUpDate: lead.nextFollowUpDate || null,
                        timestamp: new Date()
                      };

                      const followUps = [...(lead.followUps || []), newFollowUp];
                      const isFinal = lead.status === 'Won' || lead.status === 'Lost';
                      
                      handleUpdate({ 
                        followUps,
                        isSalesSubmitted: isFinal,
                        updatedAt: new Date() as any,
                        ...(isFinal ? {} : { salesRemark: '', nextFollowUpDate: '' })
                      }, false);
                    }}`;
lines.splice(1251, 1323 - 1251 + 1, replacement);
fs.writeFileSync('src/components/LeadDetail.tsx', lines.join('\n'));
