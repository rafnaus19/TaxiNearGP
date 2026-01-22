// driver.js
let driverId = "driver_" + Math.floor(Math.random()*100000);
let online = false;
let busy = false;
let map, marker;
let heatLayers = {};

navigator.geolocation.getCurrentPosition(pos => {
  map = L.map("map").setView([pos.coords.latitude, pos.coords.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  marker = L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map);
});

// Toggle online/offline
document.getElementById("toggleBtn").onclick = () => {
  if (!online) goOnline(); else goOffline();
};

function goOnline() {
  const taxiNo = document.getElementById("taxiNumber").value;
  if (!taxiNo.startsWith("T")) { alert("Taxi number must start with T"); return; }
  const seats = document.getElementById("seats").value;
  const type = document.getElementById("type").value;

  online = true;
  document.getElementById("statusText").textContent = "ONLINE";
  document.getElementById("taxiInfo").textContent = "Taxi: " + taxiNo;
  document.getElementById("toggleBtn").textContent = "GO OFFLINE";

  navigator.geolocation.watchPosition(pos => {
    firebase.database().ref("drivers/"+driverId).set({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      online: true,
      busy: busy,
      taxiNumber: taxiNo,
      seats: seats,
      type: type,
      time: Date.now()
    });
    marker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
  });
}

// Go offline
function goOffline() {
  online = false;
  busy = false;
  document.getElementById("statusText").textContent = "OFFLINE";
  document.getElementById("taxiInfo").textContent = "Taxi: N/A";
  document.getElementById("toggleBtn").textContent = "GO ONLINE";
  firebase.database().ref("drivers/"+driverId).remove();
}

// Listen for requests
firebase.database().ref("requests").on("value", snap => {
  snap.forEach(r => {
    const req = r.val();
    if (!req.driver && online && !busy) {
      document.getElementById("requestSound").play();
      if (confirm("New ride request. Accept?")) {
        busy = true;
        firebase.database().ref("requests/"+r.key).update({
          driver: driverId,
          taxiNumber: document.getElementById("taxiNumber").value
        });
      }
    }
  });
});

// Heat map for requests
firebase.database().ref("requests").on("child_added", snap => {
  const req = snap.val();
  const reqTime = Date.now();
  const circle = L.circle([req.lat, req.lng], {radius:50, color:'red', fillOpacity:0.3}).addTo(map);
  heatLayers[snap.key] = circle;
  // Fade after 10 minutes
  setTimeout(() => { map.removeLayer(circle); delete heatLayers[snap.key]; }, 10*60*1000);
});