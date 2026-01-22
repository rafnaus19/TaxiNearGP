let map, myMarker, driverId = "driver_" + Date.now();
let online = false;

// Initialize map
navigator.geolocation.getCurrentPosition(pos=>{
  map = L.map("map").setView([pos.coords.latitude,pos.coords.longitude],15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  myMarker = L.circle([pos.coords.latitude,pos.coords.longitude], {radius:30,color:'green',fillOpacity:0.5}).addTo(map);
});

// Toggle online/offline
document.getElementById("toggleBtn").onclick = ()=>{
  const taxiNumber = document.getElementById("taxiNumber").value.trim();
  const seats = parseInt(document.getElementById("seats").value) || 4;
  const type = document.getElementById("type").value;

  if(!taxiNumber) return alert("Enter taxi number!");

  online = !online;
  const statusText = document.getElementById("statusText");
  const taxiInfo = document.getElementById("taxiInfo");

  if(online){
    statusText.textContent = "ONLINE";
    statusText.classList.add("online");
    statusText.classList.remove("offline");
    taxiInfo.textContent = "Taxi: " + taxiNumber;
    document.getElementById("toggleBtn").textContent = "GO OFFLINE";

    firebase.database().ref("drivers/"+driverId).set({
      online:true,
      lat:myMarker.getLatLng().lat,
      lng:myMarker.getLatLng().lng,
      taxiNumber,
      seats,
      type
    });

  } else {
    statusText.textContent = "OFFLINE";
    statusText.classList.add("offline");
    statusText.classList.remove("online");
    taxiInfo.textContent = "Taxi: N/A";
    document.getElementById("toggleBtn").textContent = "GO ONLINE";
    firebase.database().ref("drivers/"+driverId).update({online:false});
  }
};

// Update location every 5s if online
setInterval(()=>{
  if(!online || !map) return;
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    myMarker.setLatLng([lat,lng]);
    firebase.database().ref("drivers/"+driverId).update({lat,lng});
  });
},5000);