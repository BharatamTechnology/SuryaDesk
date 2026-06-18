import { collection, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GlobalSettings } from '../types';

export const settingsService = {
  getSettings: async (): Promise<GlobalSettings> => {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GlobalSettings;
    }
    return {};
  },

  updateStepDeadlines: async (deadlines: { [stepId: number]: number }): Promise<void> => {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, { stepDeadlines: deadlines }, { merge: true });
  },

  getRates: async (): Promise<Record<string, Record<string, number>> | null> => {
    try {
      const docRef = doc(db, 'settings', 'rates');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.table) {
          return data.table as Record<string, Record<string, number>>;
        }
      }
      return null;
    } catch (e) {
      console.error("Error getting rates from Firestore:", e);
      return null;
    }
  },

  saveRates: async (rates: Record<string, Record<string, number>>): Promise<void> => {
    const docRef = doc(db, 'settings', 'rates');
    await setDoc(docRef, { table: rates });
  },

  subscribeToRates: (callback: (rates: Record<string, Record<string, number>> | null) => void) => {
    const docRef = doc(db, 'settings', 'rates');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.table) {
          callback(data.table);
          return;
        }
      }
      callback(null);
    }, (error) => {
      console.error("Error listening to changes in rates document:", error);
    });
  }
};

