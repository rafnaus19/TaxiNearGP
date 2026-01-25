let map;
let markers = {};
let passengerLatLng;

const statusBar = document.getElementById("passengerStatus");
const countBox = document.getElementById("count");

// Load map immediately
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

// Listen online drivers only
firebase.database()
  .ref("drivers")
  .orderByChild("online")
  .equalTo(true)
  .on("value", snap => {

    const drivers = snap.val() || {};
    let count = 0;

    for (const id in drivers) {
      const d = drivers[id];
      count++;

      const latlng = [d.lat, d.lng];
      const popup = `
        <b>${d.taxiNumber}</b><br>
        Seats: ${d.seats}<br>
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

function hail(driverId) {
  statusBar.innerText = "Requesting taxi...";
  firebase.database().ref("requests").push({
    driverId,
    lat: passengerLatLng[0],
    lng: passengerLatLng[1],
    time: Date.now()
  });
}