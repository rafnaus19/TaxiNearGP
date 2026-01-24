// Replace your Firebase config here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://taxinear-23c95-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "taxinear-23c95",
  storageBucket: "taxinear-23c95.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();