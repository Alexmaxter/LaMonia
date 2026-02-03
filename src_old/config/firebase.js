// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <--- 1. Importamos Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvFv05IJoQgTLzGZZ1caZ0HR1YxpcnoC0",
  authDomain: "sistemaadmin-gestion.firebaseapp.com",
  projectId: "sistemaadmin-gestion",
  storageBucket: "sistemaadmin-gestion.firebasestorage.app",
  messagingSenderId: "1076212390122",
  appId: "1:1076212390122:web:bba4cf0e04688cfd2ddf93",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Inicializamos y EXPORTAMOS la base de datos
export const db = getFirestore(app);
