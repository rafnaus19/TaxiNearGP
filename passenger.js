let map;
let markers = {};
let passengerLatLng;

const statusBar = document.getElementById("passengerStatus");
const countBox = document.getElementById("count");

// Map
map = L.map("map").setView([0,0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// Passenger location
navigator.geolocation.watchPosition(pos => {
  passengerLatLng = [pos.coords.latitude, pos.coords.longitude];
  map.setView(passengerLatLng, 15);

  if (!window.pMarker) {
    window.pMarker = L.circle(passengerLatLng, {
      radius: 40,
      color: "blue",
      fillOpacity: 0.4
    }).addTo(map);
  } else {
    window.pMarker.setLatLng(passengerLatLng);
  }
});

// Listen only online drivers
firebase.database()
  .ref("drivers")
  .orderByChild("online")
  .equalTo(true)
  .on("value", snap => {

    const drivers = snap.val() || {};
    const now = Date.now();
    let count = 0;

    // Remove ghost markers
    for (const id in markers) {
      if (!drivers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    }

    // Add / update live drivers
    for (const id in drivers) {
      const d = drivers[id];

      // Auto-hide stale drivers (older than 30 sec)
      if (now - d.updatedAt > 30000) {
        firebase.database().ref("drivers/" + id + "/online").set(false);
        continue;
      }

      count++;

      const latlng = [d.lat, d.lng];
      const popup = `
        <b>${d.taxiNumber}</b><br>
        <button onclick="hail('${id}')">Hail</button>
      `;

      if (markers[id]) {
        markers[id].setLatLng(latlng);
      } else {
        markers[id] = L.marker(latlng).addTo(map).bindPopup(popup);
      }
    }

    countBox.innerText = "Online: " + count;
  });

// Send hail request
function hail(driverId){
  statusBar.innerText = "Requesting taxi...";

  firebase.database().ref("requests").push({
    driverId,
    lat: passengerLatLng[0],
    lng: passengerLatLng[1],
    time: Date.now()
  });

  new Audio("assets/sounds/accepted.mp3").play();
}