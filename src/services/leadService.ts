import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  or,
  orderBy, 
  Timestamp,
  runTransaction,
  onSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { OperationType, handleFirestoreError } from '../lib/firestoreUtils';
import { notificationService } from './notificationService';
import { formatCreatorName } from '../utils/creatorUtils';

const COLLECTION_NAME = 'leads';

const normalizeEmail = (email: string | null | undefined) => email?.toLowerCase().trim();

const getFieldLabel = (field: string) => {
  switch (field) {
    case 'assignedPreSales': return 'Pre-Sales';
    case 'assignedTo':
    case 'assignedToEmail': return 'Lead Executive';
    case 'visitedByEmail': return 'Technical Survey';
    case 'assignedSalesEmail': return 'Sales Team';
    case 'projectAssigneeEmail': return 'Project Manager';
    case 'accAssigneeEmail': return 'Accountant';
    case 'projectInchargeEmail': return 'Project Coordinator';
    case 's_newConn_assignedToEmail': return 'New Connection Step';
    case 's_docCorr_assignedToEmail': return 'Doc Correction Step';
    case 's_loadExt_assignedToEmail': return 'Load Extension Step';
    case 'execution_assignedToEmail': return 'Online Registration Step';
    case 's4_loanAssignedToEmail': return 'Loan Processing Step';
    case 's5_storeDispatchAssignedToEmail': return 'Meter Dispatch Step';
    case 's5_discomPreAssignedToEmail': return 'DISCOM Pre-survey Step';
    case 's6_inchargeAssignedToEmail': return 'Site Incharge Step';
    case 's5_storeInchargeAssignedToEmail': return 'Store Incharge Step';
    case 's6_assignedToEmail': return 'Site Team Step';
    case 's7_assignedToEmail': return 'Office Exec Step';
    case 's8_assignedToEmail': return 'DISCOM Post-Install Step';
    case 's9_assignedToEmail': return 'Loan Officer Step';
    case 's10_assignedToEmail': return 'Step 10 (Post-Install Phase)';
    case 's11_assignedToEmail': return 'Subsidy Section Step';
    default: return 'Task';
  }
};

const getModuleType = (field: string) => {
  if (['assignedPreSales', 'assignedTo', 'assignedToEmail', 'assignedSalesEmail'].includes(field)) {
    return 'lead_management';
  }
  if (field === 'visitedByEmail') {
    return 'site_survey';
  }
  if (['projectAssigneeEmail', 'accAssigneeEmail', 'projectInchargeEmail'].includes(field)) {
    return 'project_control';
  }
  return 'task_sheet'; // any step
};

export const leadService = {
  async getAllLeads(role?: string | null, email?: string | null) {
    try {
      const normalizedEmail = normalizeEmail(email);
      console.log(`Fetching leads for role: ${role}, email: ${normalizedEmail}`);
      let q;
      if (role === 'Admin' || normalizedEmail === 'hemant.tyagi@bharatamtechnology.com') {
        q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
      } else if (normalizedEmail) {
        // Query leads where the user is a member OR creator OR assigned specifically
        const searchEmails = [normalizedEmail];
        
        q = query(
          collection(db, COLLECTION_NAME), 
          or(
            where('members', 'array-contains-any', searchEmails),
            where('createdBy', '==', normalizedEmail),
            where('assignedPreSales', '==', normalizedEmail),
            where('assignedTo', '==', normalizedEmail),
            where('assignedToEmail', '==', normalizedEmail),
            where('visitedByEmail', '==', normalizedEmail),
            where('assignedSalesEmail', '==', normalizedEmail),
            where('projectAssigneeEmail', '==', normalizedEmail),
            where('accAssigneeEmail', '==', normalizedEmail),
            where('projectInchargeEmail', '==', normalizedEmail),
            where('s_docCorr_assignedToEmail', '==', normalizedEmail),
            where('s_loadExt_assignedToEmail', '==', normalizedEmail),
            where('execution_assignedToEmail', '==', normalizedEmail),
            where('s4_loanAssignedToEmail', '==', normalizedEmail),
            where('s5_storeDispatchAssignedToEmail', '==', normalizedEmail),
            where('s5_discomPreAssignedToEmail', '==', normalizedEmail),
            where('s6_inchargeAssignedToEmail', '==', normalizedEmail),
            where('s5_storeInchargeAssignedToEmail', '==', normalizedEmail),
            where('s6_assignedToEmail', '==', normalizedEmail),
            where('s7_assignedToEmail', '==', normalizedEmail),
            where('s8_assignedToEmail', '==', normalizedEmail),
            where('s9_assignedToEmail', '==', normalizedEmail),
            where('s10_assignedToEmail', '==', normalizedEmail),
            where('s11_assignedToEmail', '==', normalizedEmail)
          ),
          orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      } else {
        return [];
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  },

  subscribeToLeads(role: string | null | undefined, email: string | null | undefined, callback: (leads: any[]) => void) {
    const normalizedEmail = normalizeEmail(email);
    console.log(`Subscribing to leads for role: ${role}, email: ${normalizedEmail}`);
    let q;
    if (role === 'Admin' || normalizedEmail === 'hemant.tyagi@bharatamtechnology.com') {
      q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
    } else if (normalizedEmail) {
      const searchEmails = [normalizedEmail];
      
      q = query(
        collection(db, COLLECTION_NAME), 
        or(
          where('members', 'array-contains-any', searchEmails),
          where('createdBy', '==', normalizedEmail),
          where('assignedPreSales', '==', normalizedEmail),
          where('assignedTo', '==', normalizedEmail),
          where('assignedToEmail', '==', normalizedEmail),
          where('visitedByEmail', '==', normalizedEmail),
          where('assignedSalesEmail', '==', normalizedEmail),
          where('projectAssigneeEmail', '==', normalizedEmail),
          where('accAssigneeEmail', '==', normalizedEmail),
          where('projectInchargeEmail', '==', normalizedEmail),
          where('s_docCorr_assignedToEmail', '==', normalizedEmail),
          where('s_loadExt_assignedToEmail', '==', normalizedEmail),
          where('execution_assignedToEmail', '==', normalizedEmail),
          where('s4_loanAssignedToEmail', '==', normalizedEmail),
          where('s5_storeDispatchAssignedToEmail', '==', normalizedEmail),
          where('s5_discomPreAssignedToEmail', '==', normalizedEmail),
          where('s6_inchargeAssignedToEmail', '==', normalizedEmail),
          where('s5_storeInchargeAssignedToEmail', '==', normalizedEmail),
          where('s6_assignedToEmail', '==', normalizedEmail),
          where('s7_assignedToEmail', '==', normalizedEmail),
          where('s8_assignedToEmail', '==', normalizedEmail),
          where('s9_assignedToEmail', '==', normalizedEmail),
          where('s10_assignedToEmail', '==', normalizedEmail),
          where('s11_assignedToEmail', '==', normalizedEmail)
        ),
        orderBy('updatedAt', 'desc')
      );
    } else {
      callback([]);
      return () => {};
    }
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  subscribeToLead(id: string, callback: (lead: any | null) => void) {
    const docRef = doc(db, COLLECTION_NAME, id);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() as any });
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
    });
  },

  async getLead(id: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() as any };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
    }
  },

  async createLead(data: DocumentData) {
    try {
      return await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'leads');
        const counterSnap = await transaction.get(counterRef);
        
        let newId = 1;
        if (counterSnap.exists()) {
          newId = counterSnap.data().count + 1;
          transaction.update(counterRef, { count: newId });
        } else {
          transaction.set(counterRef, { count: 1 });
        }

        const leadId = `L-${String(newId).padStart(4, '0')}`;
        const now = new Date();
        const punchDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const creatorEmail = normalizeEmail(auth.currentUser?.email);
        const emailFields = [
          'assignedPreSales',
          'assignedTo',
          'assignedToEmail',
          'visitedByEmail',
          'assignedSalesEmail',
          'projectAssigneeEmail',
          'accAssigneeEmail',
          'projectInchargeEmail',
          's_docCorr_assignedToEmail',
          's_loadExt_assignedToEmail',
          'execution_assignedToEmail',
          's4_loanAssignedToEmail',
          's5_storeDispatchAssignedToEmail',
          's5_discomPreAssignedToEmail',
          's6_inchargeAssignedToEmail',
          's5_storeInchargeAssignedToEmail',
          's6_assignedToEmail',
          's7_assignedToEmail',
          's8_assignedToEmail',
          's9_assignedToEmail',
          's10_assignedToEmail',
          's11_assignedToEmail'
        ];

        const members = [creatorEmail];
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
          createdByName: formatCreatorName(auth.currentUser?.displayName || undefined, creatorEmail),
          members: members,
          status: data.status || 'New',
          isSubmitted: data.isSubmitted || false
        };
        
        const newLeadRef = doc(collection(db, COLLECTION_NAME));
        transaction.set(newLeadRef, payload);
        
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
        'assignedPreSales',
        'assignedTo',
        'assignedToEmail',
        'visitedByEmail',
        'assignedSalesEmail',
        'projectAssigneeEmail',
        'accAssigneeEmail',
        'projectInchargeEmail',
        's_newConn_assignedToEmail',
        's_docCorr_assignedToEmail',
        's_loadExt_assignedToEmail',
        'execution_assignedToEmail',
        's4_loanAssignedToEmail',
        's5_storeDispatchAssignedToEmail',
        's5_discomPreAssignedToEmail',
        's6_inchargeAssignedToEmail',
        's5_storeInchargeAssignedToEmail',
        's6_assignedToEmail',
        's7_assignedToEmail',
        's8_assignedToEmail',
        's9_assignedToEmail',
        's10_assignedToEmail',
        's11_assignedToEmail'
      ];

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        let members = Array.isArray(currentData.members) ? [...currentData.members] : [];
        let membersChanged = false;

        // Ensure current creator is in members
        if (currentData.createdBy && !members.includes(currentData.createdBy)) {
          members.push(currentData.createdBy);
          membersChanged = true;
        }

        for (const field of emailFields) {
          const newEmail = normalizeEmail(data[field]);
          const currentEmail = normalizeEmail(currentData[field]);
          
          if (newEmail && newEmail !== currentEmail) {
            if (!members.includes(newEmail)) {
              members.push(newEmail);
              membersChanged = true;
            }

            // Create notification document
            const customerName = currentData.customerName || "Solar Installation";
            const label = getFieldLabel(field);
            const moduleType = getModuleType(field);
            const currentUserEmail = auth.currentUser?.email || "Admin";

            if (newEmail !== normalizeEmail(currentUserEmail)) {
              notificationService.createNotification({
                userId: newEmail,
                message: `You have been assigned to ${label} task for customer - ${customerName}`,
                taskId: field,
                moduleType,
                projectId: id,
                projectName: customerName,
                assignedBy: currentUserEmail
              }).catch(err => console.error("Could not write assignment notification:", err));
            }
          }
        }

        if (data.assignedTo && typeof data.assignedTo === 'string') {
          updates.assignedTo = normalizeEmail(data.assignedTo);
          if (!members.includes(updates.assignedTo)) {
            members.push(updates.assignedTo);
            membersChanged = true;
          }

          const currentAssignedTo = normalizeEmail(currentData.assignedTo);
          if (updates.assignedTo && updates.assignedTo !== currentAssignedTo) {
            const customerName = currentData.customerName || "Solar Installation";
            const currentUserEmail = auth.currentUser?.email || "Admin";
            if (updates.assignedTo !== normalizeEmail(currentUserEmail)) {
              notificationService.createNotification({
                userId: updates.assignedTo,
                message: `You have been assigned to Lead Executive task for customer - ${customerName}`,
                taskId: 'assignedTo',
                moduleType: 'lead_management',
                projectId: id,
                projectName: customerName,
                assignedBy: currentUserEmail
              }).catch(err => console.error("Could not write assignment notification:", err));
            }
          }
        }

        if (membersChanged) {
          updates.members = members;
        }
      }

      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deleteLead(id: string) {
    try {
      // 1. Before deleting Firestore document, list all files in Storage folder: leads/{leadId}/
      const folderRef = ref(storage, `leads/${id}`);
      
      try {
        const fileList = await listAll(folderRef);
        // 2. Delete all files from that folder using listAll() and deleteObject()
        const deletePromises = fileList.items.map((fileRef) => deleteObject(fileRef));
        await Promise.all(deletePromises);
        console.log(`Successfully deleted all associated files in storage folder leads/${id}`);
      } catch (storageError) {
        // 4. Handle errors — if storage delete fails, still delete Firestore doc but show warning
        console.warn("Associated Firebase Storage files deletion failed or folder was empty:", storageError);
        if (typeof window !== "undefined") {
          alert("Warning: Some associated files in Firebase Storage could not be deleted, but the lead document will still be deleted.");
        }
      }

      // 3. Then delete the Firestore document
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
