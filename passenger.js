const map = L.map("map").setView([0, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

const countEl = document.getElementById("count");

let driverMarkers = {};
let passengerMarker = null;

// Passenger location
navigator.geolocation.getCurrentPosition(
  pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    passengerMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "blue"
    }).addTo(map);

    map.setView([lat, lng], 15);
  },
  err => alert(err.message),
  { enableHighAccuracy: true }
);

// Listen for drivers
firebase.database().ref("drivers").on("value", snap => {
  const drivers = snap.val() || {};

  countEl.textContent = Object.keys(drivers).length;

  // Remove offline drivers
  Object.keys(driverMarkers).forEach(id => {
    if (!drivers[id]) {
      map.removeLayer(driverMarkers[id]);
      delete driverMarkers[id];
    }
  });

  // Add / update drivers
  Object.keys(drivers).forEach(id => {
    const d = drivers[id];

    if (!driverMarkers[id]) {
      driverMarkers[id] = L.marker([d.lat, d.lng]).addTo(map);
    } else {
      driverMarkers[id].setLatLng([d.lat, d.lng]);
    }
  });
});