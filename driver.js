// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyApZo_e__tYmNqWIeJA-cXR1oi0GVwWevo",
  authDomain: "taxinear-23c95.firebaseapp.com",
  databaseURL: "https://taxinear-23c95-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "taxinear-23c95",
  storageBucket: "taxinear-23c95.appspot.com",
  messagingSenderId: "991076256035",
  appId: "1:991076256035:web:58a88de033307cff60a496"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let driverId = "driver_" + Math.floor(Math.random() * 100000);
let watchId = null;
let driverMarker = null;
let map = L.map('map').fitWorld();
let routeLine = null;

// Leaflet map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Firebase anonymous login
firebase.auth().signInAnonymously().then(()=>console.log("Driver Auth OK"));

// Go online
function goOnline() {
  document.getElementById("status").innerText = "Status: ONLINE (TRACKING)";
  if(!navigator.geolocation) return alert("Geolocation not supported!");

  const driverRef = database.ref("drivers/" + driverId);
  driverRef.onDisconnect().remove(); // automatically remove if disconnect

  watchId = navigator.geolocation.watchPosition(
    (pos)=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if(!driverMarker){
        driverMarker = L.marker([lat,lng]).addTo(map).bindPopup("You").openPopup();
        map.setView([lat,lng],15);
      } else driverMarker.setLatLng([lat,lng]);

      // Update driver data in database
      driverRef.set({
        lat, 
        lng,
        status: "vacant",
        updatedAt: Date.now()
      });
    },
    (err)=>alert("GPS error: "+err.message),
    {enableHighAccuracy:true}
  );

  listenHails();
  listenRoute();
}

// Go offline
function goOffline(){
  if(watchId!==null) navigator.geolocation.clearWatch(watchId);
  database.ref("drivers/"+driverId).remove()
  .then(()=>document.getElementById("status").innerText="Status: OFFLINE")
  .catch(e=>alert("Error removing driver: "+e.message));
}

// Listen for hail requests
function listenHails(){
  const hailRef = database.ref("drivers/"+driverId+"/hail");
  hailRef.on("value",(snapshot)=>{
    const hail = snapshot.val();
    if(hail){
      if(confirm(`🚖 Hail from passenger ${hail.passengerId}! Accept?`)){
        database.ref("drivers/"+driverId+"/accepted").set(true);
        database.ref("drivers/"+driverId+"/target").set({
          lat: hail.passengerLat,
          lng: hail.passengerLng
        });
      }
      hailRef.remove();
    }
  });
}

// Draw route to passenger
function listenRoute(){
  const targetRef = database.ref("drivers/"+driverId+"/target");
  targetRef.on("value",(snapshot)=>{
    const target = snapshot.val();
    if(target && driverMarker){
      if(routeLine) map.removeLayer(routeLine);
      routeLine = L.polyline([
        [driverMarker.getLatLng().lat, driverMarker.getLatLng().lng],
        [target.lat, target.lng]
      ], {color:'blue', weight:4}).addTo(map);
    }
  });
}