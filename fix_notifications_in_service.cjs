const fs = require('fs');
let code = fs.readFileSync('src/services/leadService.ts', 'utf-8');

const createLeadMatch = /const newLeadRef = doc\(collection\(db, COLLECTION_NAME\)\);\s*transaction\.set\(newLeadRef, payload\);\s*return newLeadRef\.id;/;
const createReplacement = `const newLeadRef = doc(collection(db, COLLECTION_NAME));
        transaction.set(newLeadRef, payload);
        
        // Notify assignees on creation
        const leadName = data.customerName || 'New Lead';
        for (const field of emailFields) {
          const email = normalizeEmail(data[field]);
          if (email && email !== creatorEmail) { // Don't notify the creator
             notificationService.createNotification(email, \`You have been assigned to a new lead: \${leadName}\`, newLeadRef.id, leadName);
          }
        }
        
        return newLeadRef.id;`;

if(createLeadMatch.test(code)) {
  code = code.replace(createLeadMatch, createReplacement);
}

const updateLeadMatch = /for \(const field of emailFields\) \{[\s\S]*?if \(newEmail && !members\.includes\(newEmail\)\) \{[\s\S]*?members\.push\(newEmail\);[\s\S]*?membersChanged = true;[\s\S]*?\}[\s\S]*?\}/;
const updateReplacement = `for (const field of emailFields) {
          const newEmail = normalizeEmail(data[field]);
          const currentEmail = normalizeEmail(currentData[field]);
          
          if (newEmail && newEmail !== currentEmail) {
            if (!members.includes(newEmail)) {
              members.push(newEmail);
              membersChanged = true;
            }
            
            // Trigger notification
            const leadName = currentData.customerName || 'Lead';
            notificationService.createNotification(
               newEmail, 
               \`You have been assigned to an active lead: \${leadName}\`, 
               id, 
               leadName
            );
          }
        }`;

if(updateLeadMatch.test(code)) {
  code = code.replace(updateLeadMatch, updateReplacement);
}

fs.writeFileSync('src/services/leadService.ts', code);
