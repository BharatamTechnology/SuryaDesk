import { db } from "../lib/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

export const kwService = {
  getKwOptions: async (phase: string) => {
    const q = query(collection(db, "kwOptions"), where("phase", "==", phase));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().kwValues || [];
    }
    return [];
  },
  
  saveKwOptions: async (phase: string, kwValues: string[]) => {
    await setDoc(doc(db, "kwOptions", phase), {
      phase,
      kwValues
    });
  }
};
