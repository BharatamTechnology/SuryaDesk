const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetail.tsx', 'utf8');

// 1. Remove the pending payment block from Project Details (Financials) tab submit
const pendingBlockRegex = /if \(lead\.advanceReceived === 'Yes'\) \{\s*\/\/ Check for existing payments[\s\S]*?\}\s*\}\s*await handleUpdate\(\{\s*isFinancialsSubmitted: true,/g;
let match = pendingBlockRegex.exec(code);
if (match) {
    code = code.replace(pendingBlockRegex, "await handleUpdate({\n                          isFinancialsSubmitted: true,");
    console.log("Removed Pending Advance block from Financials tab submit.");
} else {
    console.log("Could not find the Pending Advance block.");
}

// Ensure the success message is updated for Financials tab
code = code.replace(/"Project details submitted and pending advance record posted in payments history!", "success"/g, '"Project details submitted successfully!", "success"');

// 2. Fix the Accounts tab to check for Confirmed payment to avoid duplication
const accountsSubmitRegex = /const pendingDoc = paymentSnap\.docs\.find\(d => d\.data\(\)\.status === 'Pending'\);\s*if \(lead\.accPaymentStatus === "Confirmed"\).*?\}\s*\} else if \(lead\.accPaymentStatus === "No" && pendingDoc\) \{/gs;

let accountsMatch = accountsSubmitRegex.exec(code);
if (accountsMatch) {
    const replacement = `const pendingDoc = paymentSnap.docs.find(d => d.data().status === 'Pending');
                        const confirmedDoc = paymentSnap.docs.find(d => d.data().status === 'Confirmed');

                        if (lead.accPaymentStatus === "Confirmed") {
                          if (pendingDoc) {
                            // Confirm the existing pending advance payment
                            await paymentService.confirmPayment(pendingDoc.id, {
                              amount: Number(lead.accAmount),
                              utrNo: lead.accUtrNo,
                              date: lead.accDate,
                              remarks: 'Confirmed via Accounts Tab Submission'
                            });
                          } else if (confirmedDoc) {
                            // Already confirmed, just update the document
                            // NOTE: We don't call confirmPayment again to prevent incrementing lead.payment_receivedAmount repeatedly
                            // We just update the payment document with the new values
                            await updateDoc(doc(db, 'payments', confirmedDoc.id), {
                              amount: Number(lead.accAmount),
                              utrNo: lead.accUtrNo || '',
                              date: lead.accDate || '',
                            });
                          } else {
                            // Create and automatically confirm new payment
                            await paymentService.addPayment({
                              leadId: lead.id,
                              leadName: lead.customerName || 'Unknown',
                              amount: Number(lead.accAmount),
                              utrNo: lead.accUtrNo || '',
                              date: lead.accDate || '',
                              paymentType: 'Advance',
                              remarks: 'Confirmed via Accounts Tab Submission',
                              status: 'Confirmed',
                              method: 'Online'
                            });
                          }
                        } else if (lead.accPaymentStatus === "No" && pendingDoc) {`;
    code = code.replace(accountsSubmitRegex, replacement);
    console.log("Updated Accounts tab submit to handle Confirmed payments gracefully.");
} else {
    console.log("Could not find Accounts tab submit block.");
}

fs.writeFileSync('src/components/LeadDetail.tsx', code);
