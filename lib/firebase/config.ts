import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "greek-2026",
  appId: "1:736137736866:web:245658103b95adf1cd1dfb",
  storageBucket: "greek-2026.firebasestorage.app",
  apiKey: "AIzaSyDn8moKjAgR5K1V1-CrRH_i7JnLFjKe99w",
  authDomain: "greek-2026.firebaseapp.com",
  messagingSenderId: "736137736866",
  measurementId: "G-NSKHYTD4D6"
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleDriveProvider = new GoogleAuthProvider();
googleDriveProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleDriveProvider.addScope('https://www.googleapis.com/auth/documents.readonly');
googleDriveProvider.setCustomParameters({
  prompt: 'select_account'
});
