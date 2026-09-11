// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_wcXRBR8fjtaxOTui5tTQhh2D01CEX9c",
    authDomain: "vacaciones-proseinet.firebaseapp.com",
    projectId: "vacaciones-proseinet",
    storageBucket: "vacaciones-proseinet.firebasestorage.app",
    messagingSenderId: "1072255242510",
    appId: "1:1072255242510:web:9314a6ec3d13e130e6c75f"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };