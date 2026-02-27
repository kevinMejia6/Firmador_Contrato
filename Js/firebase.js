import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZGZYq8TVtOqCa56QN_MAyNQ6Hm7O_3sw",
  authDomain: "firmador-de-contrato.firebaseapp.com",
  projectId: "firmador-de-contrato",
  storageBucket: "firmador-de-contrato.firebasestorage.app",
  messagingSenderId: "365445608108",
  appId: "1:365445608108:web:2a2ec326699bb9d628a509"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);