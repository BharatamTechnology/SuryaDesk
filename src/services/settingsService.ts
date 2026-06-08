import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
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
  }
};
