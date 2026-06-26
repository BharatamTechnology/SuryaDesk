import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs,
  onSnapshot,
  query
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { AppUser } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow: boolean = true) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

const COLLECTION_NAME = 'users';

export const userService = {
  async createUser(user: AppUser) {
    try {
      const userRef = doc(db, COLLECTION_NAME, user.email);
      await setDoc(userRef, user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${user.email}`);
    }
  },

  async updateUser(email: string, data: Partial<AppUser>) {
    try {
      const { updateDoc } = await import("firebase/firestore");
      const userRef = doc(db, COLLECTION_NAME, email);
      await updateDoc(userRef, data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${email}`);
    }
  },

  async deleteUser(email: string) {
    try {
      const { deleteDoc } = await import("firebase/firestore");
      const userRef = doc(db, COLLECTION_NAME, email);
      await deleteDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${email}`);
    }
  },

  async getUserRole(email: string): Promise<AppUser['role'] | null> {
    try {
      const lowerEmail = email.toLowerCase().trim();
      if (lowerEmail === "sitvikrenew@gmail.com") {
        return "Admin";
      }
      if (lowerEmail === "sitvik24@gmail.com" || lowerEmail === "hemanttyagi225@gmail.com") {
        return "Executive";
      }
      const userRef = doc(db, COLLECTION_NAME, email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const role = (userSnap.data() as AppUser).role;
        return role;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${email}`);
      return null;
    }
  },

  async getAllUsers(): Promise<AppUser[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      return snapshot.docs.map(doc => {
        const data = doc.data() || {};
        const email = doc.id;
        const lowerEmail = email.toLowerCase().trim();
        
        let role = data.role || "Executive";
        let category = data.category || "None";
        
        if (lowerEmail === "sitvikrenew@gmail.com") {
          role = "Admin";
          category = "None";
        } else if (lowerEmail === "sitvik24@gmail.com") {
          role = "Executive";
          category = "Project Coordinator";
        } else if (lowerEmail === "hemanttyagi225@gmail.com") {
          role = "Executive";
          category = "None";
        }
        
        return {
          ...data,
          email: email,
          name: data.name || email.split("@")[0] || "Blank Record",
          role: role,
          category: category
        } as AppUser;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  subscribeToUsers(callback: (users: AppUser[]) => void) {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(q, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => {
        const d = doc.data() || {};
        const email = doc.id;
        const lowerEmail = email.toLowerCase().trim();
        
        let role = d.role || "Executive";
        let category = d.category || "None";
        
        if (lowerEmail === "sitvikrenew@gmail.com") {
          role = "Admin";
          category = "None";
        } else if (lowerEmail === "sitvik24@gmail.com") {
          role = "Executive";
          category = "Project Coordinator";
        } else if (lowerEmail === "hemanttyagi225@gmail.com") {
          role = "Executive";
          category = "None";
        }
        
        return {
          ...d,
          email: email,
          name: d.name || email.split("@")[0] || "Blank Record",
          role: role,
          category: category
        } as AppUser;
      });
      callback(data);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME, false);
    });
  },

  async seedUsers() {
    const users: AppUser[] = [
      { name: "Sitvik", role: "Executive", email: "sitvik24@gmail.com", category: "Project Coordinator" },
      { name: "Sitvik (Admin)", role: "Admin", email: "sitvikrenew@gmail.com" },
      { name: "Kishan Lal Meena", role: "Admin", email: "kishanlalmeena.admin@gmail.com" }, 
      { name: "Pawan Kumar", role: "Executive", email: "pawanchaudharyaaaa051@gmail.com" },
      { name: "Rahul Nagarwal", role: "Executive", email: "rahulnagarwal366@gmail.com" },
      { name: "Vishnu Kumar Sharma", role: "Executive", email: "76513vk@gmail.com" },
      { name: "Anmol Rathi", role: "Executive", email: "anmolrathi20@gmail.com" },
      { name: "Gajendra Meena", role: "Executive", email: "Gajendrameena3164@gmail.com" },
      { name: "Nitesh", role: "Executive", email: "nm8877485@gmail.com" }
    ];

    for (const user of users) {
      await this.createUser(user);
    }
  }
};
