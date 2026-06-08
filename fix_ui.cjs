const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf-8');

const regexStep1End = /<InputField\s*label="Assign for Step 2: Loan Process"[\s\S]*?\/>/;

const match = code.match(regexStep1End);
if(match && match.length > 0) {
  const replacement = `{lead.loanRequired !== 'Yes' ? (
                <InputField 
                  label="Assign for Step 3: Meter Dispatch" 
                  value={lead.s5_storeDispatchAssignedTo} 
                  name="s5_storeDispatchAssignedTo" 
                  options={users.map(u => u.name)} 
                  onUpdate={(updates) => {
                    const selectedUser = users.find(u => u.name === updates.s5_storeDispatchAssignedTo);
                    handleUpdate({
                      ...updates,
                      s5_storeDispatchAssignedTo: selectedUser?.name || updates.s5_storeDispatchAssignedTo,
                      s5_storeDispatchAssignedToEmail: selectedUser?.email || lead.s5_storeDispatchAssignedToEmail
                    });
                  }} 
                  disabled={!canEditStep(1)} 
                />
              ) : (
                ${match[0]}
              )}`;

  code = code.replace(match[0], replacement);
  fs.writeFileSync('src/components/LeadDetail.tsx', code);
  console.log('Updated UI for Step 3 assignment in Step 1.');
} else {
  console.log('Match not found for Step 1 UI fix.');
}
