import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PaymentRecord, Lead } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firestoreUtils';

const COLLECTION_NAME = 'payments';

export const paymentService = {
  async addPayment(payment: Omit<PaymentRecord, 'id' | 'recordedBy' | 'recordedAt'>) {
    try {
      return await runTransaction(db, async (transaction) => {
        const leadRef = doc(db, 'leads', payment.leadId);
        const leadSnap = await transaction.get(leadRef);
        
        if (!leadSnap.exists()) {
          throw new Error("Lead not found");
        }

        const leadData = leadSnap.data() as Lead;
        const now = Timestamp.now();
        const recordedBy = auth.currentUser?.email || 'Unknown';
        
        // Helper to get sum of all existing payment fields for initialization
        const getExistingTotal = (data: any) => {
          return (Number(data.advanceAmount) || 0) + 
                 (Number(data.s4_firstInstallmentAmount) || 0) + 
                 (Number(data.s9_secondInstallmentAmount) || 0) + 
                 (Number(data.s10_balanceAmount) || 0);
        };

        // Add payment record
        const paymentData = {
          ...payment,
          recordedBy,
          recordedAt: now,
          date: payment.date || now.toDate().toISOString().split('T')[0],
          status: payment.status || 'Confirmed',
          confirmationAssignee: payment.confirmationAssignee || ''
        };
        
        const newPaymentRef = doc(collection(db, COLLECTION_NAME));
        transaction.set(newPaymentRef, paymentData);

        // If the payment is pending confirmation, do not update Lead fields yet!
        if (paymentData.status === 'Pending') {
          return newPaymentRef.id;
        }

        // Update Lead fields based on payment type
        const updates: any = {
          updatedAt: now
        };

        if (payment.paymentType === 'Advance') {
          updates.advanceAmount = (Number(leadData.advanceAmount) || 0) + Number(payment.amount);
          updates.advanceReceived = 'Yes';
          updates.advanceUrtNo = payment.utrNo;
          updates.advanceDate = payment.date;
        } else if (payment.paymentType === 'Installment 1') {
          updates.s4_firstInstallmentAmount = (Number(leadData.s4_firstInstallmentAmount) || 0) + Number(payment.amount);
          updates.s4_firstInstallmentReceived = 'Yes';
          updates.s4_firstInstallmentUtr = payment.utrNo;
          updates.s4_firstInstallmentDate = payment.date;
        } else if (payment.paymentType === 'Installment 2') {
          updates.s9_secondInstallmentAmount = (Number(leadData.s9_secondInstallmentAmount) || 0) + Number(payment.amount);
          updates.s9_secondInstallmentReceived = 'Yes';
          updates.s9_secondInstallmentUtr = payment.utrNo;
          updates.s9_secondInstallmentDate = payment.date;
        } else if (payment.paymentType === 'Balance') {
          updates.s10_balanceAmount = (Number(leadData.s10_balanceAmount) || 0) + Number(payment.amount);
          updates.s10_balanceApplicable = 'Yes';
          updates.s10_balanceUtr = payment.utrNo;
          updates.s10_balanceDate = payment.date;
        }

        // Properly calculate total received to include both new and existing payments
        // If payment_receivedAmount exists, it should already include all recorded payments via this service
        // However, if we're just starting to use this new field, we should base it on the sum of individual fields
        const baseReceived = leadData.payment_receivedAmount !== undefined 
          ? Number(leadData.payment_receivedAmount) 
          : getExistingTotal(leadData);
          
        updates.payment_receivedAmount = baseReceived + Number(payment.amount);
        
        const totalAmount = Number(leadData.finalRate) || Number(leadData.payment_totalAmount) || 0;
        if (totalAmount > 0) {
          updates.payment_balanceAmount = totalAmount - updates.payment_receivedAmount;
          if (updates.payment_receivedAmount >= totalAmount) {
            updates.payment_status = 'Full';
          } else if (updates.payment_receivedAmount > 0) {
            updates.payment_status = 'Partial';
          }
        }

        transaction.update(leadRef, updates);
        
        return newPaymentRef.id;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
      throw error;
    }
  },

  async deletePayment(paymentId: string) {
    try {
      return await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, COLLECTION_NAME, paymentId);
        const paymentSnap = await transaction.get(paymentRef);
        
        if (!paymentSnap.exists()) {
          throw new Error("Payment record not found");
        }

        const paymentData = paymentSnap.data() as PaymentRecord;
        const leadRef = doc(db, 'leads', paymentData.leadId);
        const leadSnap = await transaction.get(leadRef);
        
        if (!leadSnap.exists()) {
          // If the parent lead doesn't exist, we can still cleanly trash the orphan payment record
          transaction.delete(paymentRef);
          return;
        }

        const leadData = leadSnap.data() as Lead;
        const now = Timestamp.now();
        
        const updates: any = {
          updatedAt: now
        };

        if (paymentData.paymentType === 'Advance') {
          const newAmt = Math.max(0, (Number(leadData.advanceAmount) || 0) - Number(paymentData.amount));
          updates.advanceAmount = newAmt;
          if (newAmt === 0) {
            updates.advanceReceived = 'No';
            updates.advanceUrtNo = '';
            updates.advanceDate = '';
          }
        } else if (paymentData.paymentType === 'Installment 1') {
          const newAmt = Math.max(0, (Number(leadData.s4_firstInstallmentAmount) || 0) - Number(paymentData.amount));
          updates.s4_firstInstallmentAmount = newAmt;
          if (newAmt === 0) {
            updates.s4_firstInstallmentReceived = 'No';
            updates.s4_firstInstallmentUtr = '';
            updates.s4_firstInstallmentDate = '';
          }
        } else if (paymentData.paymentType === 'Installment 2') {
          const newAmt = Math.max(0, (Number(leadData.s9_secondInstallmentAmount) || 0) - Number(paymentData.amount));
          updates.s9_secondInstallmentAmount = newAmt;
          if (newAmt === 0) {
            updates.s9_secondInstallmentReceived = 'No';
            updates.s9_secondInstallmentUtr = '';
            updates.s9_secondInstallmentDate = '';
          }
        } else if (paymentData.paymentType === 'Balance') {
          const newAmt = Math.max(0, (Number(leadData.s10_balanceAmount) || 0) - Number(paymentData.amount));
          updates.s10_balanceAmount = newAmt;
          if (newAmt === 0) {
            updates.s10_balanceApplicable = 'No';
            updates.s10_balanceUtr = '';
            updates.s10_balanceDate = '';
          }
        }

        const getExistingTotal = (data: any) => {
          return (Number(data.advanceAmount) || 0) + 
                 (Number(data.s4_firstInstallmentAmount) || 0) + 
                 (Number(data.s9_secondInstallmentAmount) || 0) + 
                 (Number(data.s10_balanceAmount) || 0);
        };

        const baseReceived = leadData.payment_receivedAmount !== undefined 
          ? Number(leadData.payment_receivedAmount) 
          : getExistingTotal(leadData);
          
        updates.payment_receivedAmount = Math.max(0, baseReceived - Number(paymentData.amount));
        
        const totalAmount = Number(leadData.finalRate) || Number(leadData.payment_totalAmount) || 0;
        if (totalAmount > 0) {
          updates.payment_balanceAmount = Math.max(0, totalAmount - updates.payment_receivedAmount);
          if (updates.payment_receivedAmount >= totalAmount) {
            updates.payment_status = 'Full';
          } else if (updates.payment_receivedAmount > 0) {
            updates.payment_status = 'Partial';
          } else {
            updates.payment_status = 'Pending';
          }
        } else {
          updates.payment_balanceAmount = 0;
          updates.payment_status = 'Pending';
        }

        transaction.delete(paymentRef);
        transaction.update(leadRef, updates);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${paymentId}`);
      throw error;
    }
  },

  async getPaymentsByLead(leadId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('leadId', '==', leadId)
      );
      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
      // Sort in memory to avoid needing a composite index
      return payments.sort((a, b) => b.recordedAt?.toMillis ? b.recordedAt.toMillis() - a.recordedAt.toMillis() : 0);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  },

  subscribeToPaymentsByLead(leadId: string, callback: (payments: PaymentRecord[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('leadId', '==', leadId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
      // Sort in memory
      const sorted = payments.sort((a, b) => {
        const timeA = a.recordedAt?.toMillis ? a.recordedAt.toMillis() : 0;
        const timeB = b.recordedAt?.toMillis ? b.recordedAt.toMillis() : 0;
        return timeB - timeA;
      });
      callback(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  subscribeToPendingPayments(callback: (payments: PaymentRecord[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'Pending')
    );
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
      callback(payments);
    }, (error) => {
      console.error("Error subscribing to pending payments: ", error);
    });
  },

  async confirmPayment(paymentId: string, updated: Partial<PaymentRecord>) {
    try {
      return await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, COLLECTION_NAME, paymentId);
        const paymentSnap = await transaction.get(paymentRef);
        if (!paymentSnap.exists()) throw new Error("Payment not found");
        const originalPayment = paymentSnap.data() as PaymentRecord;

        const leadRef = doc(db, 'leads', originalPayment.leadId);
        const leadSnap = await transaction.get(leadRef);
        if (!leadSnap.exists()) throw new Error("Lead not found");
        const leadData = leadSnap.data() as Lead;

        const now = Timestamp.now();
        const confBy = auth.currentUser?.email || 'Unknown';

        // Updated values
        const finalAmt = updated.amount !== undefined ? Number(updated.amount) : Number(originalPayment.amount);
        const finalUtr = updated.utrNo !== undefined ? updated.utrNo : originalPayment.utrNo;
        const finalType = updated.paymentType !== undefined ? updated.paymentType : originalPayment.paymentType;
        const finalDate = updated.date !== undefined ? updated.date : originalPayment.date;
        const finalRemarks = updated.remarks !== undefined ? updated.remarks : originalPayment.remarks;

        // Update payment document to Confirmed
        transaction.update(paymentRef, {
          amount: finalAmt,
          utrNo: finalUtr,
          paymentType: finalType,
          date: finalDate,
          remarks: finalRemarks,
          status: 'Confirmed',
          confirmedBy: confBy,
          confirmedAt: now
        });

        // Helper to get sum of all existing payment fields for initialization
        const getExistingTotal = (data: any) => {
          return (Number(data.advanceAmount) || 0) + 
                 (Number(data.s4_firstInstallmentAmount) || 0) + 
                 (Number(data.s9_secondInstallmentAmount) || 0) + 
                 (Number(data.s10_balanceAmount) || 0);
        };

        // Update Lead fields based on payment type
        const updates: any = {
          updatedAt: now
        };

        if (finalType === 'Advance') {
          updates.advanceAmount = (Number(leadData.advanceAmount) || 0) + finalAmt;
          updates.advanceReceived = 'Yes';
          updates.advanceUrtNo = finalUtr;
          updates.advanceDate = finalDate;
        } else if (finalType === 'Installment 1') {
          updates.s4_firstInstallmentAmount = (Number(leadData.s4_firstInstallmentAmount) || 0) + finalAmt;
          updates.s4_firstInstallmentReceived = 'Yes';
          updates.s4_firstInstallmentUtr = finalUtr;
          updates.s4_firstInstallmentDate = finalDate;
        } else if (finalType === 'Installment 2') {
          updates.s9_secondInstallmentAmount = (Number(leadData.s9_secondInstallmentAmount) || 0) + finalAmt;
          updates.s9_secondInstallmentReceived = 'Yes';
          updates.s9_secondInstallmentUtr = finalUtr;
          updates.s9_secondInstallmentDate = finalDate;
        } else if (finalType === 'Balance') {
          updates.s10_balanceAmount = (Number(leadData.s10_balanceAmount) || 0) + finalAmt;
          updates.s10_balanceApplicable = 'Yes';
          updates.s10_balanceUtr = finalUtr;
          updates.s10_balanceDate = finalDate;
        }

        const baseReceived = leadData.payment_receivedAmount !== undefined 
          ? Number(leadData.payment_receivedAmount) 
          : getExistingTotal(leadData);
          
        updates.payment_receivedAmount = baseReceived + finalAmt;
        
        const totalAmount = Number(leadData.finalRate) || Number(leadData.payment_totalAmount) || 0;
        if (totalAmount > 0) {
          updates.payment_balanceAmount = Math.max(0, totalAmount - updates.payment_receivedAmount);
          if (updates.payment_receivedAmount >= totalAmount) {
            updates.payment_status = 'Full';
          } else if (updates.payment_receivedAmount > 0) {
            updates.payment_status = 'Partial';
          }
        }

        transaction.update(leadRef, updates);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${paymentId}`);
      throw error;
    }
  },

  async rejectPayment(paymentId: string) {
    try {
      const { updateDoc } = await import("firebase/firestore");
      const paymentRef = doc(db, COLLECTION_NAME, paymentId);
      await updateDoc(paymentRef, {
        status: 'Rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: auth.currentUser?.email || 'Unknown'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${paymentId}`);
      throw error;
    }
  },

  async getAllPayments() {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('recordedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  }
};
