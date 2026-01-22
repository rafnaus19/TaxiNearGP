// Persistent driver ID
let driverId = localStorage.getItem("driverId");
if (!driverId) {
  driverId = "driver_" + Math.floor(Math.random() * 1000000);
  localStorage.setItem("driverId", driverId);
}

const statusEl = document.getElementById("status");
let watchId = null;
let marker = null;

const map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

// Sound for incoming requests
const requestSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

function goOnline() {
  if (!navigator.geolocation) { alert("GPS not supported"); return; }

  statusEl.textContent = "REQUESTING GPS...";

  watchId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    statusEl.textContent = "ONLINE";

    if (!marker) marker = L.marker([lat, lng]).addTo(map);
    else marker.setLatLng([lat, lng]);

    map.setView([lat, lng], 16);

    firebase.database().ref("drivers/" + driverId).set({
      lat, lng, online: true, updatedAt: Date.now()
    });

  }, err => { statusEl.textContent = "GPS DENIED"; alert(err.message); },
  { enableHighAccuracy: true });

  listenForRequests();
}

function goOffline() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;

  firebase.database().ref("drivers/" + driverId).remove();
  firebase.database().ref("requests").orderByChild("driverId").equalTo(driverId).once("value", snap => {
    snap.forEach(r => r.ref.remove());
  });

  if (marker) { map.removeLayer(marker); marker = null; }
  statusEl.textContent = "OFFLINE";
}

// Listen for passenger requests
function listenForRequests() {
  firebase.database().ref("requests").orderByChild("driverId").equalTo(driverId).on("child_added", snap => {
    const req = snap.val();
    if (req.status === "pending") {
      requestSound.play();
      const accept = confirm(`Hail request from passenger!\nAccept?`);
      if (accept) snap.ref.update({ status: "accepted" });
      else snap.ref.update({ status: "rejected" });
    }
  });
}