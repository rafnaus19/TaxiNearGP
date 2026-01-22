// firebase.js
const firebaseConfig = {
  databaseURL: "https://taxinear-23c95-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();