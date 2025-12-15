// ========================
// Firebase config
// ========================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDD4DbbZzT6Mm1guTJUYE-HEtG4hq1qaP8",
  authDomain: "scanner-v3.firebaseapp.com",
  databaseURL: "https://scanner-v3-default-rtdb.firebaseio.com",
  projectId: "scanner-v3",
  storageBucket: "scanner-v3.firebasestorage.app",
  messagingSenderId: "547241024349",
  appId: "1:547241024349:web:5665e19ce04c5e658ba6b4",
  measurementId: "G-0BEPYTG88V"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
