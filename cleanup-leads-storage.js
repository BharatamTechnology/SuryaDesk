import admin from 'firebase-admin';
import fs from 'fs';

// Read Firebase applet configuration
const configPath = './firebase-applet-config.json';
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

const projectId = config.projectId || "ai-studio-applet-webapp-2b467";
const databaseId = config.firestoreDatabaseId || "ai-studio-d6591e66-7485-47a0-9bed-be94141d90ae";
const storageBucket = config.storageBucket || "ai-studio-applet-webapp-2b467.firebasestorage.app";

console.log('==================================================');
console.log('  SITVIK SOLAR - STORAGE CLEANUP UTILITY SCRIPT');
console.log('==================================================');
console.log(`Project ID:        ${projectId}`);
console.log(`Database ID:       ${databaseId}`);
console.log(`Storage Bucket:    ${storageBucket}`);
console.log('==================================================\n');

// Initialize Firebase Admin SDK
admin.initializeApp({
  projectId: projectId,
  storageBucket: storageBucket,
});

// Resolve the custom multi-database Firestore instance
const db = admin.firestore(databaseId);
const bucket = admin.storage().bucket();

async function runCleanup() {
  try {
    // 1. Get all lead IDs from Firestore "leads" collection
    console.log('Step 1: Fetching active leads from Firestore...');
    const leadsSnapshot = await db.collection('leads').select().get();
    const existingLeadIds = new Set(leadsSnapshot.docs.map(doc => doc.id));
    console.log(`--> Found ${existingLeadIds.size} active leads in Firestore.\n`);

    // 2. Get all folder names inside Firebase Storage "leads/" directory
    console.log('Step 2: Scanning files in Firebase Storage under "leads/" directory...');
    const [, , apiResponse] = await bucket.getFiles({
      prefix: 'leads/',
      delimiter: '/'
    });

    const prefixes = apiResponse.prefixes || [];
    console.log(`--> Found ${prefixes.length} folders in storage bucket under \"leads/\".\n`);

    // 3. Compare lists and remove orphaned directories
    console.log('Step 3: Comparing lists & cleaning up orphaned directories...');
    let keptCount = 0;
    let deletedCount = 0;

    for (const prefix of prefixes) {
      // Prefix looks like 'leads/someLeadId/'
      const parts = prefix.split('/');
      const leadId = parts[1];

      if (!leadId) continue;

      if (existingLeadIds.has(leadId)) {
        console.log(`[KEEP]    Active Lead ID: ${leadId} (Folder "leads/${leadId}/" contains active files)`);
        keptCount++;
      } else {
        console.log(`[DELETE]  Orphaned Lead ID: ${leadId} (No matching Firestore doc!)`);
        console.log(`          -> Deleting all files inside storage prefix: "${prefix}"...`);
        
        try {
          const [filesToDelete] = await bucket.getFiles({ prefix: prefix });
          if (filesToDelete.length === 0) {
            console.log(`          -> Already empty/No files to delete.`);
          } else {
            console.log(`          -> Found ${filesToDelete.length} files. Removing...`);
            await bucket.deleteFiles({ prefix: prefix });
          }
          console.log(`[SUCCESS] Deleted orphaned storage directory: "${prefix}"`);
          deletedCount++;
        } catch (deleteError) {
          console.error(`[ERROR]   Could not delete contents of folder "${prefix}":`, deleteError);
        }
      }
    }

    console.log('\n==================================================');
    console.log('  CLEANUP OPERATION SUMMARY');
    console.log('==================================================');
    console.log(`Active Folders Kept:       ${keptCount}`);
    console.log(`Orphaned Folders Deleted:  ${deletedCount}`);
    console.log('==================================================');

  } catch (error) {
    console.error('Fatal error occurred during directory cleanup:', error);
  }
}

runCleanup();
