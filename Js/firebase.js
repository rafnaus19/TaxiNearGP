<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>

<script>
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "taxinear-23c95.firebaseapp.com",
  databaseURL: "https://taxinear-23c95-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "taxinear-23c95",
  storageBucket: "taxinear-23c95.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
</script>