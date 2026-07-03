import { db } from '../lib/firebase';
import { collection, doc, getDoc, setDoc, addDoc, Timestamp } from 'firebase/firestore';

const normalizeEmail = (email: string) => email.toLowerCase().trim();

export const companyService = {
  async getUserCompany(email: string) {
    try {
      const userRef = doc(db, 'users', normalizeEmail(email));
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return null;

      const userData = userSnap.data();
      const companyId = userData.companyId;
      if (!companyId) return null;

      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) return null;

      return { companyId, role: userData.role, ...companySnap.data() };
    } catch (error) {
      console.error('Error fetching user company:', error);
      return null;
    }
  },

  async createCompanyAndUser(email: string, displayName: string, companyName: string) {
    try {
      const normalizedEmail = normalizeEmail(email);

      const companyRef = await addDoc(collection(db, 'companies'), {
        name: companyName,
        ownerEmail: normalizedEmail,
        createdAt: Timestamp.now(),
        subscriptionTier: 'Trial'
      });
      const companyId = companyRef.id;

      const userRef = doc(db, 'users', normalizedEmail);
      await setDoc(userRef, {
        name: displayName || normalizedEmail,
        role: 'Admin',
        email: normalizedEmail,
        companyId
      }, { merge: true });

      return { companyId, role: 'Admin' };
    } catch (error) {
      console.error('Error creating company and user:', error);
      throw error;
    }
  }
};
