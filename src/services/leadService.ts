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
import { db, auth } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreUtils';

const COLLECTION_NAME = 'leads';

const normalizeEmail = (email: string | null | undefined) => email?.toLowerCase().trim();

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
          createdByName: auth.currentUser?.displayName || creatorEmail,
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
          }
        }

        if (data.assignedTo && typeof data.assignedTo === 'string') {
          updates.assignedTo = normalizeEmail(data.assignedTo);
          if (!members.includes(updates.assignedTo)) {
            members.push(updates.assignedTo);
            membersChanged = true;
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
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
