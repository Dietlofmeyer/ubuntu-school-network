// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfxDkuFSCzqwjhhWkHy37puhvTPl3ro90",
  authDomain: "school-system-aa9b4.firebaseapp.com",
  projectId: "school-system-aa9b4",
  storageBucket: "school-system-aa9b4.firebasestorage.app",
  messagingSenderId: "428015334842",
  appId: "1:428015334842:web:6be786684a265c557bd983",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
