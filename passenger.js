let map;
let driverMarkers = {};
let passengerLatLng;

navigator.geolocation.getCurrentPosition(
  pos => initMap(pos),
  () => alert("Please allow location access")
);

function initMap(pos) {
  passengerLatLng = [pos.coords.latitude, pos.coords.longitude];

  map = L.map("map", { zoomControl: false }).setView(passengerLatLng, 15);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 19 }
  ).addTo(map);

  L.circle(passengerLatLng, {
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

    for (const id in drivers) {
      const d = drivers[id];
      if (!d || d.online !== true) {
        if (driverMarkers[id]) { map.removeLayer(driverMarkers[id]); delete driverMarkers[id]; }
        continue;
      }

      onlineCount++;
      const latlng = [d.lat, d.lng];

      if (driverMarkers[id]) {
        driverMarkers[id].setLatLng(latlng);
        driverMarkers[id].getPopup().setContent(`
          🚕 ${d.taxiNumber || "Taxi"}<br>
          <button onclick="hailTaxi('${id}')">Hail</button>
        `);
      } else {
        driverMarkers[id] = L.marker(latlng)
          .addTo(map)
          .bindPopup(`
            🚕 ${d.taxiNumber || "Taxi"}<br>
            <button onclick="hailTaxi('${id}')">Hail</button>
          `);
      }
    }

    document.getElementById("onlineCount").innerText = "Online taxis: " + onlineCount;
  });
}

function hailTaxi(driverId) {
  alert("Hail sent to " + driverId + " (next step)");
}