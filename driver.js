const driverId = "driver_" + Math.floor(Math.random() * 1000000);
const statusEl = document.getElementById("status");

let watchId = null;
let marker = null;

const map = L.map("map").setView([0, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

function goOnline() {
  if (!navigator.geolocation) {
    alert("GPS not supported");
    return;
  }

  statusEl.textContent = "REQUESTING GPS...";

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      statusEl.textContent = "ONLINE";

      if (!marker) {
        marker = L.marker([lat, lng]).addTo(map);
      } else {
        marker.setLatLng([lat, lng]);
      }

      map.setView([lat, lng], 16);

      firebase.database().ref("drivers/" + driverId).set({
        lat,
        lng,
        online: true,
        updatedAt: Date.now()
      });
    },
    err => {
      statusEl.textContent = "GPS DENIED";
      alert(err.message);
    },
    { enableHighAccuracy: true }
  );
}

function goOffline() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  firebase.database().ref("drivers/" + driverId).remove();

  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }

  statusEl.textContent = "OFFLINE";
}