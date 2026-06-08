const fs = require('fs');
let code = fs.readFileSync('src/services/leadService.ts', 'utf-8');

code = code.replace(/export enum OperationType \{[\s\S]*?\}\n/, '');
code = code.replace(/interface FirestoreErrorInfo \{[\s\S]*?\}\n/, '');
code = code.replace(/export function handleFirestoreError[\s\S]*?\}\n/, '');
code = code.replace(/import \{ db, auth \} from '\.\.\/lib\/firebase';/, "import { db, auth } from '../lib/firebase';\nimport { OperationType, handleFirestoreError } from '../lib/firestoreUtils';\nimport { notificationService } from './notificationService';");

fs.writeFileSync('src/services/leadService.ts', code);
