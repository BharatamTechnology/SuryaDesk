import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  Timestamp 
} from 'firebase/firestore';

export const companyService = {
  async getUserCompany(uid: string) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const userData = userSnap.data();
      const companyId = userData.companyId;

      if (!companyId) {
        return null;
      }

      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        return null;
      }

      return {
        companyId,
        role: userData.role,
        ...companySnap.data()
      };
    } catch (error) {
      console.error('Error fetching user company:', error);
      return null;
    }
  },

  async createCompanyAndUser(uid: string, email: string, companyName: string) {
    try {
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: companyName,
        ownerEmail: email,
        createdAt: Timestamp.now(),
        subscriptionTier: 'Trial'
      });

      const companyId = companyRef.id;

      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        companyId,
        role: 'Admin',
        email
      }, { merge: true });

      return { companyId, role: 'Admin' };
    } catch (error) {
      console.error('Error creating company and user:', error);
      throw error;
    }
  }
};
