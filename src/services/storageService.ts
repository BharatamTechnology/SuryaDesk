import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../lib/firebase";

export const storageService = {
  async uploadLeadDocument(leadId: string, file: File, docType: string, onProgress?: (progress: number) => void): Promise<string> {
    const startTime = Date.now();
    console.log(`[Storage] [${startTime}] Initiating atomic upload for ${docType} (${file.size} bytes)`);
    
    if (!auth.currentUser) {
      console.error("[Storage] Auth missing");
      throw new Error("Authentication required: Please log in again.");
    }

    if (!storage.app.options.storageBucket) {
      console.error("[Storage] Bucket missing in config");
      throw new Error("Storage configuration error: Bucket name is missing.");
    }

    const safeDocType = docType.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = file.name.split('.').pop() || 'file';
    const fileName = `${safeDocType}_${Date.now()}.${extension}`;
    const storagePath = `leads/${leadId}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    console.log(`[Storage] Path: ${storagePath}`);

    // Create a timeout promise
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Upload timed out after 3 minutes. This often happens if the Firebase Storage bucket isn't properly initialized or if the file is too large for your connection."));
      }, 180000); // 3 minutes is usually plenty for atomic uploads
    });

    try {
      // For atomic upload, we can't get real-time progress easily,
      // but we can simulate a "start" and "done" progress.
      if (onProgress) onProgress(10);

      // Race the upload against the timeout
      const uploadResult = await Promise.race([
        uploadBytes(storageRef, file),
        timeout
      ]);

      if (onProgress) onProgress(100);
      
      console.log(`[Storage] Atomic upload successful for ${docType}`);
      const url = await getDownloadURL(uploadResult.ref);
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`[Storage] Success! URL generated in ${duration.toFixed(2)}s`);
      
      return url;
    } catch (error: any) {
      console.error(`[Storage] Upload failed:`, error.code || error.name, error.message);
      
      if (error.code === 'storage/unauthorized') {
        throw new Error("Access Denied: Please check if Storage is enabled in your Firebase Console and the rules allow your user to write.");
      } else if (error.code === 'storage/quota-exceeded') {
        throw new Error("Storage quota exceeded. Please upgrade your Firebase project.");
      } else if (error.code === 'storage/retry-limit-exceeded') {
        throw new Error("Connection failed after multiple retries. Check your network.");
      }
      
      throw error;
    }
  },

  async uploadServiceRequestPhoto(requestId: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    const startTime = Date.now();
    console.log(`[Storage] [${startTime}] Initiating service request photo upload for ${requestId} (${file.size} bytes)`);
    
    if (!auth.currentUser) throw new Error("Authentication required.");
    
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `issue_photo_${Date.now()}.${extension}`;
    const storagePath = `serviceRequests/${requestId}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    try {
      if (onProgress) onProgress(10);
      const uploadResult = await uploadBytes(storageRef, file);
      if (onProgress) onProgress(100);
      return await getDownloadURL(uploadResult.ref);
    } catch (error: any) {
      console.error(`[Storage] Service request upload failed:`, error.message);
      throw error;
    }
  }
};
