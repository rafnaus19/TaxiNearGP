let map;
let driverMarkers = {};
let passengerId = "passenger_" + Math.floor(Math.random() * 1000000);
let passengerLatLng;
let activeRequest = null; // currently active request
let rejectedDrivers = {}; // {driverId: timestamp}

// sounds
const acceptedSound = new Audio("assets/sounds/accepted.mp3");

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
  listenRequests();
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
        driverMarkers[id].getPopup().setContent(
          `<b>🚕 ${d.taxiNumber || "Taxi"}</b> (${d.seats || "N/A"} seats)<br>
          <button onclick="hailTaxi('${id}')">Hail</button>`
        );
      } else {
        driverMarkers[id] = L.marker(latlng)
          .addTo(map)
          .bindPopup(
            `<b>🚕 ${d.taxiNumber || "Taxi"}</b> (${d.seats || "N/A"} seats)<br>
            <button onclick="hailTaxi('${id}')">Hail</button>`
          );
      }
    }

    document.getElementById("onlineCount").innerText = "Online taxis: " + onlineCount;
  });
}

function hailTaxi(driverId) {
  const now = Date.now();

  if (activeRequest) {
    alert("You already have an active request!");
    return;
  }

  if (rejectedDrivers[driverId] && now - rejectedDrivers[driverId] < 60000) {
    alert("Please wait 1 minute before requesting the same driver again.");
    return;
  }

  const requestRef = firebase.database().ref("requests").push();
  activeRequest = {
    id: requestRef.key,
    driverId: driverId,
    status: "pending",
    timestamp: now
  };

  requestRef.set({
    passengerId: passengerId,
    driverId: driverId,
    status: "pending",
    timestamp: now
  });

  alert("Request sent!");
}

function listenRequests() {
  firebase.database().ref("requests").on("value", snapshot => {
    const requests = snapshot.val() || {};

    for (const reqId in requests) {
      const r = requests[reqId];

      // check if request belongs to this passenger
      if (r.passengerId === passengerId) {
        if (r.status === "accepted" && activeRequest && activeRequest.id === reqId) {
          acceptedSound.play();
          alert(`Driver accepted your request: ${r.driverId}`);
        }
        if ((r.status === "cancelled" || r.status === "completed") && activeRequest && activeRequest.id === reqId) {
          activeRequest = null;
        }
        if (r.status === "rejected" && activeRequest && activeRequest.id === reqId) {
          activeRequest = null;
          rejectedDrivers[r.driverId] = Date.now();
          alert(`Driver ${r.driverId} rejected your request. Wait 1 minute to request again.`);
        }
      }
    }
  });
}