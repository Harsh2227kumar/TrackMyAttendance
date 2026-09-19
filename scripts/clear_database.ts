import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const collectionsToClear = [
  'students',
  'faculty',
  'subjects',
  'events',
  'event_attendance',
  'attendance_requests',
  'audit_logs',
  'users',
];

async function clearDatabase() {
  console.log('--- Starting Database Purge ---');
  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Found ${snap.docs.length} documents in "${colName}". Deleting...`);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
      console.log(`Successfully cleared "${colName}".`);
    } catch (err) {
      console.error(`Error clearing ${colName}:`, err);
    }
  }

  // Initialize fresh login database with specified temporary credentials
  console.log('--- Seeding Fresh Temporary Login Credentials in "users" ---');
  const adminUser = {
    username: 'admin.academic',
    password: 'Password123!',
    role: 'ADMIN',
    name: 'Academic Cell Administrator',
    created_at: new Date().toISOString(),
  };

  const organiserUser = {
    username: 'org.vp',
    password: 'Password123!',
    role: 'ORGANISER',
    name: 'Prof. V. P. (Event Organiser)',
    created_at: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', 'admin-academic'), adminUser);
  await setDoc(doc(db, 'users', 'org-vp'), organiserUser);

  console.log('Created admin.academic and org.vp login records.');
  console.log('Students will be dynamically authorized from PRN and {firstname}.{last 3 no.} upon upload.');
  console.log('--- Database Purge & Fresh Initialization Complete ---');
}

clearDatabase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal error clearing database:', e);
    process.exit(1);
  });
