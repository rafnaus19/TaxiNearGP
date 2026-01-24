// driver.js

let map;
let driverMarker;
let watchId = null;
let driverId = "driver_" + Math.floor(Math.random() * 1000000);

const statusEl = document.getElementById("status");

function initMap(lat, lng) {
  map = L.map("map", { zoomControl: false }).setView([lat, lng], 15);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  driverMarker = L.marker([lat, lng]).addTo(map);
}

function goOnline() {
  if (!navigator.geolocation) {
    alert("GPS not supported");
    return;
  }

  statusEl.innerText = "🟢 ONLINE";
  statusEl.style.background = "#0a7d00";
  statusEl.style.color = "#fff";

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!map) {
        initMap(lat, lng);
      } else {
        driverMarker.setLatLng([lat, lng]);
        map.setView([lat, lng]);
      }

      firebase.database().ref("drivers/" + driverId).set({
        lat: lat,
        lng: lng,
        online: true,
        updatedAt: Date.now()
      });
    },
    err => {
      alert("Location error");
      console.error(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

function goOffline() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  firebase.database().ref("drivers/" + driverId).update({
    online: false,
    updatedAt: Date.now()
  });

  statusEl.innerText = "🔴 OFFLINE";
  statusEl.style.background = "#900";
  statusEl.style.color = "#fff";
}