// firebase.js
// Make sure you replace YOUR_API_KEY etc with your Firebase project info

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "taxinear-23c95.firebaseapp.com",
  databaseURL: "https://taxinear-23c95-default-rtdb.firebaseio.com",
  projectId: "taxinear-23c95",
  storageBucket: "taxinear-23c95.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();