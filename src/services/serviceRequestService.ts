import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  getDoc,
  where,
  or
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ServiceRequest, Lead } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firestoreUtils';
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'serviceRequests';

export const serviceRequestService = {
  async createRequest(request: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...request,
        isNewCustomer: request.isNewCustomer ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const assignedEmail = request.assignedToEmail;
      if (assignedEmail) {
        notificationService.createNotification({
          userId: assignedEmail.toLowerCase().trim(),
          message: `You have been assigned to service request for customer - ${request.customerName || "a customer"}`,
          taskId: docRef.id,
          moduleType: 'service_request',
          projectId: docRef.id,
          projectName: request.customerName || "Service Request",
          assignedBy: auth.currentUser?.email || 'Admin'
        }).catch(err => console.error(err));
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    }
  },

  async updateRequest(id: string, updates: Partial<ServiceRequest>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      
      let currentEmail = '';
      let customerName = 'Service Request';
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          currentEmail = snap.data().assignedToEmail || '';
          customerName = snap.data().customerName || 'Service Request';
        }
      } catch (e) {
        console.error(e);
      }

      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      const newEmail = updates.assignedToEmail;
      if (newEmail && newEmail.toLowerCase().trim() !== currentEmail.toLowerCase().trim()) {
        const currentUserEmail = auth.currentUser?.email || "Admin";
        if (newEmail.toLowerCase().trim() !== currentUserEmail.toLowerCase().trim()) {
          notificationService.createNotification({
            userId: newEmail.toLowerCase().trim(),
            message: `You have been assigned to service request for customer - ${customerName}`,
            taskId: id,
            moduleType: 'service_request',
            projectId: id,
            projectName: customerName,
            assignedBy: currentUserEmail
          }).catch(err => console.error(err));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deleteRequest(id: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
    }
  },

  subscribeToRequests(userEmail: string, isAdmin: boolean, callback: (requests: ServiceRequest[]) => void) {
    const collRef = collection(db, COLLECTION_NAME);
    let q;
    
    if (isAdmin) {
      q = query(collRef);
    } else {
      q = query(
        collRef, 
        or(
          where('assignedToEmail', '==', userEmail),
          where('createdBy', '==', userEmail)
        )
      );
    }

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceRequest[];

      // Sort in frontend in descending order of createdAt to avoid index requirements
      requests.sort((a, b) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
      });

      callback(requests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  async findCustomerByMobile(mobile: string): Promise<Lead | null> {
    try {
      const q = query(collection(db, 'leads'), where('mobileNumber', '==', mobile));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Lead;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'leads');
      return null;
    }
  }
};
