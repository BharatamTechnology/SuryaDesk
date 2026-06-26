import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { db, auth, getFfMessaging } from "../lib/firebase";
import { AppNotification } from "../types";
import { OperationType, handleFirestoreError } from "../lib/firestoreUtils";

const COLLECTION_NAME = "notifications";
const USERS_COLLECTION = "users";

export const notificationService = {
  async createNotification(data: Omit<AppNotification, "timestamp" | "isRead">) {
    try {
      console.log("Creating notification document:", data);
      await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        isRead: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    }
  },

  async markAsRead(notificationId: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${notificationId}`);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId.toLowerCase().trim()),
        where("isRead", "==", false)
      );
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(notificationDoc => 
        updateDoc(doc(db, COLLECTION_NAME, notificationDoc.id), { isRead: true })
      );
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, COLLECTION_NAME);
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId.toLowerCase().trim())
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];

      // Sort in-memory to avoid requiring a composite index
      notifications.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      callback(notifications);
    }, (error) => {
      console.error("Error subscribing to notifications:", error);
      // Suppress severe throw to keep UI running in case of intermittent connect rules
    });
  },

  async saveFcmToken(userId: string, token: string) {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId.toLowerCase().trim());
      await updateDoc(userRef, { fcmToken: token });
      console.log(`Saved FcmToken to user: ${userId}`);
    } catch (error) {
      // If the user document doesn't exist yet, we can use setDoc with merge: true
      try {
        const userRef = doc(db, USERS_COLLECTION, userId.toLowerCase().trim());
        await setDoc(userRef, { fcmToken: token }, { merge: true });
      } catch (innerError) {
        handleFirestoreError(innerError, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
      }
    }
  },

  async requestAndSaveToken(userEmail: string) {
    try {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
        console.warn("FCM / Push Notifications not supported in this environment");
        return;
      }

      const messaging = await getFfMessaging();
      if (!messaging) {
        console.warn("FCM Messaging is not supported or initialized");
        return;
      }

      // 1. Register Service Worker explicitly for Firebase Messaging
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("FCM Service Worker registered successfully:", registration);

      // 2. Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission was denied");
        return;
      }

      // 3. Get FCM Token
      const { getToken } = await import("firebase/messaging");
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log("FCM Token obtained:", token);
        await this.saveFcmToken(userEmail, token);
      } else {
        console.warn("No registration token available. Request permission to generate one.");
      }
    } catch (err) {
      console.error("Error in FCM push notification registration:", err);
    }
  },

  onForegroundMessage(callback: (payload: any) => void) {
    if (typeof window === "undefined") return () => {};
    
    let unsubscribe = () => {};
    
    getFfMessaging().then(async (messaging) => {
      if (messaging) {
        const { onMessage } = await import("firebase/messaging");
        unsubscribe = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          callback(payload);
        });
      }
    }).catch(err => console.error("Could not register foreground listener:", err));

    return () => unsubscribe();
  }
};
