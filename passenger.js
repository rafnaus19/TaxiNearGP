// passenger.js

let map;
let driverMarkers = {};

navigator.geolocation.getCurrentPosition(
  pos => initMap(pos),
  () => alert("Please allow location access")
);

function initMap(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  map = L.map("map", { zoomControl: false }).setView([lat, lng], 15);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  // Passenger location
  L.circle([lat, lng], {
    radius: 60,
    color: "blue",
    fillOpacity: 0.4
  }).addTo(map);

  listenDrivers();
}

function listenDrivers() {
  firebase.database().ref("drivers").on("value", snapshot => {
    const drivers = snapshot.val() || {};
    let onlineCount = 0;

    // Clear old markers
    Object.values(driverMarkers).forEach(m => map.removeLayer(m));
    driverMarkers = {};

    for (const id in drivers) {
      const d = drivers[id];
      if (!d) continue;
      if (d.online !== true) continue;
      if (typeof d.lat !== "number") continue;
      if (typeof d.lng !== "number") continue;

      onlineCount++;

      const marker = L.marker([d.lat, d.lng])
        .addTo(map)
        .bindPopup("🚕 Taxi Online");

      driverMarkers[id] = marker;
    }

    document.getElementById("onlineCount").innerText =
      "Online taxis: " + onlineCount;
  });
}