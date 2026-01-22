<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "taxinear-23c95.firebaseapp.com",
  databaseURL: "https://taxinear-23c95-default-rtdb.firebaseio.com",
  projectId: "taxinear-23c95",
  storageBucket: "taxinear-23c95.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
</script>