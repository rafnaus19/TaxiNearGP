const map = L.map("map").setView([0, 0], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

let driverMarkers = {};

navigator.geolocation.getCurrentPosition(pos => {
  map.setView([pos.coords.latitude, pos.coords.longitude], 15);
});

firebase.database().ref("drivers").on("value", snap => {
  const data = snap.val() || {};

  // REMOVE OLD MARKERS
  Object.keys(driverMarkers).forEach(id => {
    if (!data[id]) {
      map.removeLayer(driverMarkers[id]);
      delete driverMarkers[id];
    }
  });

  // ADD / UPDATE DRIVERS
  Object.keys(data).forEach(id => {
    const d = data[id];

    if (!driverMarkers[id]) {
      driverMarkers[id] = L.marker([d.lat, d.lng]).addTo(map);
    } else {
      driverMarkers[id].setLatLng([d.lat, d.lng]);
    }
  });
});