const map = L.map("map").setView([0,0],2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);

const countEl = document.getElementById("count");
let driverMarkers = {};
let passengerMarker = null;

const hailSound = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');

// Passenger location
navigator.geolocation.getCurrentPosition(pos=>{
  const lat=pos.coords.latitude;
  const lng=pos.coords.longitude;
  passengerMarker=L.circleMarker([lat,lng],{radius:8,color:"blue",fillColor:"blue",fillOpacity:0.8}).addTo(map);
  map.setView([lat,lng],15);
}, err=>alert(err.message), {enableHighAccuracy:true});

// Show live drivers
firebase.database().ref("drivers").on("value", snap=>{
  const drivers = snap.val() || {};
  countEl.textContent = Object.keys(drivers).length;

  Object.keys(driverMarkers).forEach(id=>{
    if(!drivers[id]){
      map.removeLayer(driverMarkers[id]);
      delete driverMarkers[id];
    }
  });

  Object.keys(drivers).forEach(id=>{
    const d=drivers[id];
    if(!driverMarkers[id]){
      const m=L.marker([d.lat,d.lng]).addTo(map);
      m.on("click",()=>hailDriver(id,d.lat,d.lng));
      driverMarkers[id]=m;
    } else driverMarkers[id].setLatLng([d.lat,d.lng]);
  });
});

// Hail function
function hailDriver(driverId, lat, lng){
  if(!passengerMarker) { alert("Waiting for GPS"); return; }

  const reqRef = firebase.database().ref("requests").push();
  reqRef.set({
    passengerLat: passengerMarker.getLatLng().lat,
    passengerLng: passengerMarker.getLatLng().lng,
    driverId: driverId,
    status: "pending",
    timestamp: Date.now()
  });

  // Listen for accept/reject
  reqRef.on("value", snap=>{
    const r=snap.val();
    if(r.status==="accepted"){
      hailSound.play();
      alert("Driver accepted your request!");
      reqRef.off(); // stop listening
    } else if(r.status==="rejected"){
      alert("Driver rejected your request");
      reqRef.off();
    }
  });
}