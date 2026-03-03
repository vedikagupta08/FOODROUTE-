// frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDmvP8h2-MUf_XtsiYfNhZ3xVs3rJdu3cw",
  authDomain: "foodroute-78b8c.firebaseapp.com",
  projectId: "foodroute-78b8c",
  storageBucket: "foodroute-78b8c.firebasestorage.app",
  messagingSenderId: "322216880609",
  appId: "1:322216880609:web:e1178f441656912ee14aa0",
  measurementId: "G-GJ3JVPQZC2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
