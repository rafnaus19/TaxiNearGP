const driverId = "driver_" + Math.floor(Math.random() * 1000000);
let map, marker;
let online = false;

const statusText = document.getElementById("driverStatus");
const toggleBtn = document.getElementById("toggleBtn");

// Load map instantly
map = L.map("map").setView([0,0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// Track location live
navigator.geolocation.watchPosition(pos => {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  if (!marker) {
    marker = L.marker([lat,lng]).addTo(map);
    map.setView([lat,lng], 15);
  } else {
    marker.setLatLng([lat,lng]);
  }

  if (online) {
    firebase.database().ref("drivers/" + driverId).update({
      lat, lng, online: true, updatedAt: Date.now()
    });
  }
});

// Online / Offline toggle
toggleBtn.onclick = () => {
  online = !online;

  if (online) {
    const taxiNumber = prompt("Enter Taxi Number (e.g. T123)");
    if (!taxiNumber) {
      online = false;
      return;
    }

    firebase.database().ref("drivers/" + driverId).set({
      taxiNumber,
      taxiType: "regular",
      seats: 4,
      wheelchair: false,
      online: true,
      updatedAt: Date.now()
    });

    statusText.innerText = "Online – " + taxiNumber;
    toggleBtn.innerText = "Go Offline";
    toggleBtn.classList.add("offline");
  } else {
    firebase.database().ref("drivers/" + driverId + "/online").set(false);
    statusText.innerText = "Offline";
    toggleBtn.innerText = "Go Online";
    toggleBtn.classList.remove("offline");
  }
};