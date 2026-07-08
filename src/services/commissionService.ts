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
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CommissionRecord, CommissionRole, CommissionEntry } from '../types';

export const commissionService = {
  // New Commission Entries (Tab-Based Calculation Ledger)
  async saveCommissionEntry(data: Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    if (!auth.currentUser) throw new Error("Auth required");
    return addDoc(collection(db, 'commissions'), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: auth.currentUser.email
    });
  },

  async updateCommissionEntry(id: string, data: Partial<Omit<CommissionEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>) {
    return updateDoc(doc(db, 'commissions', id), {
      ...data,
      updatedAt: Timestamp.now()
    });
  },

  subscribeToCommissionEntries(callback: (entries: CommissionEntry[]) => void) {
    const q = query(
      collection(db, 'commissions'),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommissionEntry[];
      callback(entries);
    });
  },

  async deleteCommissionEntry(id: string) {
    return deleteDoc(doc(db, 'commissions', id));
  },
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
  },

  // Commission Roles (Admin Master Configuration)
  async addCommissionRole(data: Omit<CommissionRole, 'id' | 'createdAt'>) {
    return addDoc(collection(db, 'commissionRoles'), {
      ...data,
      createdAt: Timestamp.now()
    });
  },

  async getCommissionRoles(): Promise<CommissionRole[]> {
    const q = query(
      collection(db, 'commissionRoles'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CommissionRole[];
  },

  subscribeToCommissionRoles(callback: (roles: CommissionRole[]) => void) {
    const q = query(
      collection(db, 'commissionRoles'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const roles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommissionRole[];
      callback(roles);
    });
  },

  async updateCommissionRole(id: string, data: Partial<Omit<CommissionRole, 'id' | 'createdAt'>>) {
    return updateDoc(doc(db, 'commissionRoles', id), data as any);
  },

  async deleteCommissionRole(id: string) {
    return deleteDoc(doc(db, 'commissionRoles', id));
  }
};
