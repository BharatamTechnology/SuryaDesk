import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CommissionRecord } from '../types';

export const commissionService = {
  async addCommissionRecord(data: Omit<CommissionRecord, 'id' | 'date' | 'createdBy'>) {
    if (!auth.currentUser) throw new Error("Auth required");
    
    return addDoc(collection(db, 'commissionRecords'), {
      ...data,
      date: Timestamp.now(),
      createdBy: auth.currentUser.email
    });
  },

  subscribeToCommissions(callback: (commissions: CommissionRecord[]) => void) {
    const q = query(
      collection(db, 'commissionRecords'), 
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const commissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommissionRecord[];
      callback(commissions);
    });
  },

  async deleteCommissionRecord(id: string) {
    return deleteDoc(doc(db, 'commissionRecords', id));
  },

  async updateCommissionRecord(id: string, data: Partial<Omit<CommissionRecord, 'id' | 'date' | 'createdBy'>>) {
    return updateDoc(doc(db, 'commissionRecords', id), data as any);
  }
};
