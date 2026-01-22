const map = L.map("map").setView([0, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

let markers = {};
const countEl = document.getElementById("count");

navigator.geolocation.getCurrentPosition(pos => {
  map.setView([pos.coords.latitude, pos.coords.longitude], 15);
});

firebase.database().ref("drivers").on("value", snap => {
  const drivers = snap.val() || {};
  countEl.textContent = Object.keys(drivers).length;

  // remove offline drivers
  Object.keys(markers).forEach(id => {
    if (!drivers[id]) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  });

  // add/update online drivers
  Object.keys(drivers).forEach(id => {
    const d = drivers[id];
    if (!markers[id]) {
      markers[id] = L.marker([d.lat, d.lng]).addTo(map);
    } else {
      markers[id].setLatLng([d.lat, d.lng]);
    }
  });
});