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
  },

  getRolePermissions: async (): Promise<Record<string, any>> => {
    try {
      const docRef = doc(db, 'settings', 'role_permissions');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Record<string, any>;
      }
    } catch (e) {
      console.error("Error getting role permissions:", e);
    }
    return DEFAULT_ROLE_PERMISSIONS;
  },

  saveRolePermissions: async (permissions: Record<string, any>): Promise<void> => {
    const docRef = doc(db, 'settings', 'role_permissions');
    await setDoc(docRef, permissions);
  },

  subscribeToRolePermissions: (callback: (permissions: Record<string, any> | null) => void) => {
    const docRef = doc(db, 'settings', 'role_permissions');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback(DEFAULT_ROLE_PERMISSIONS);
      }
    }, (error) => {
      console.error("Error listening to changes in role_permissions document:", error);
      callback(DEFAULT_ROLE_PERMISSIONS);
    });
  }
};

export const DEFAULT_ROLE_PERMISSIONS = {
  Admin: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    tasks: { view: true, create: true, edit: true, delete: true },
    services: { view: true, create: true, edit: true, delete: true },
    payments: { view: true, create: true, edit: true, delete: true },
    commission: { view: true, create: true, edit: true, delete: true },
    mis: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
  },
  "Junior Admin": {
    dashboard: { view: true, create: true, edit: true, delete: false },
    tasks: { view: true, create: true, edit: true, delete: false },
    services: { view: true, create: true, edit: true, delete: false },
    payments: { view: true, create: true, edit: true, delete: false },
    commission: { view: false, create: false, edit: false, delete: false },
    mis: { view: true, create: true, edit: true, delete: false },
    admin: { view: false, create: false, edit: false, delete: false },
  },
  Executive: {
    dashboard: { view: true, create: true, edit: true, delete: false },
    tasks: { view: true, create: true, edit: true, delete: false },
    services: { view: true, create: true, edit: true, delete: false },
    payments: { view: true, create: true, edit: true, delete: false },
    commission: { view: false, create: false, edit: false, delete: false },
    mis: { view: true, create: true, edit: true, delete: false },
    admin: { view: false, create: false, edit: false, delete: false },
  },
};

