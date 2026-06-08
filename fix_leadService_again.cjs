const fs = require('fs');

const codeToInsert = `        const members = [creatorEmail];
        for (const field of emailFields) {
          const email = normalizeEmail(data[field]);
          if (email && !members.includes(email)) {
            members.push(email);
          }
        }

        const payload = {
          ...data,
          leadId,
          assignedTo: normalizeEmail(data.assignedTo),
          punchDate: data.punchDate || punchDate,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: creatorEmail,
          createdByName: auth.currentUser?.displayName || creatorEmail,
          members: members,
          status: data.status || 'New',
          isSubmitted: data.isSubmitted || false
        };
        
        const newLeadRef = doc(collection(db, COLLECTION_NAME));
        transaction.set(newLeadRef, payload);
        
        // Notify assignees on creation
        const leadName = data.customerName || 'New Lead';
        for (const field of emailFields) {
          const email = normalizeEmail(data[field]);
          if (email && email !== creatorEmail) {
             notificationService.createNotification(email, \`You have been assigned to a new lead: \${leadName}\`, newLeadRef.id, leadName);
          }
        }
        
        return newLeadRef.id;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async updateLead(id: string, data: Partial<DocumentData>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      
      const updates: any = {
        ...data,
        updatedAt: Timestamp.now()
      };

      const emailFields = [
        'assignedTo',
        'assignedToEmail',
        'visitedByEmail',
        'assignedSalesEmail',
        'projectAssigneeEmail',
        'accAssigneeEmail',
        'execution_assignedToEmail',
        's4_loanAssignedToEmail',
        's5_storeDispatchAssignedToEmail',
        's5_discomPreAssignedToEmail',
        's6_inchargeAssignedToEmail',
        's5_storeInchargeAssignedToEmail',
        's7_assignedToEmail',
        's8_assignedToEmail',
        's9_assignedToEmail',
        's10_assignedToEmail',
        's11_assignedToEmail'
      ];

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        let members = currentData.members || [];
        let membersChanged = false;

        for (const field of emailFields) {
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
        }

        if (data.assignedTo) {
          updates.assignedTo = normalizeEmail(data.assignedTo);
        }

        if (membersChanged) {
          updates.members = members;
        }
      }

      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, \`\${COLLECTION_NAME}/\${id}\`);
    }
  },

  async deleteLead(id: string) {
    try {`;

let file = fs.readFileSync('src/services/leadService.ts', 'utf-8');
const searchString = "        const members = [creatorEmail];";
const deleteStart = file.indexOf(searchString);
const deleteEnd = file.indexOf("  async deleteLead(id: string) {\n    try {");

if (deleteStart !== -1 && deleteEnd !== -1) {
  file = file.slice(0, deleteStart) + codeToInsert + file.slice(deleteEnd + "  async deleteLead(id: string) {\n    try {".length);
  fs.writeFileSync('src/services/leadService.ts', file);
  console.log("Successfully rebuilt leadService.ts");
} else {
  console.log("Could not find start/end points");
}
