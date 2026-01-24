let map;
let driverMarker;
let driverId = "driver_" + Math.floor(Math.random() * 1000000);
let gpsInterval = null;
let taxiNumber = "";
let seats = 4;
let activeRequestId = null;

const statusEl = document.getElementById("status");
const requestSound = new Audio("assets/sounds/request.mp3");

function enterTaxiDetails() {
  taxiNumber = prompt("Enter Taxi Number (e.g., T123)", taxiNumber || "");
  const s = prompt("Enter number of seats", seats);
  seats = parseInt(s) || seats;
}

function initMap(lat, lng) {
  map = L.map("map", { zoomControl: false }).setView([lat, lng], 16);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 19 }
  ).addTo(map);

  driverMarker = L.marker([lat, lng]).addTo(map).bindPopup(taxiNumber || "Taxi");
}

function updateLocation() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!map) initMap(lat, lng);
      else driverMarker.setLatLng([lat, lng]);

      firebase.database().ref("drivers/" + driverId).set({
        lat: lat,
        lng: lng,
        online: true,
        taxiNumber: taxiNumber,
        seats: seats,
        updatedAt: Date.now()
      });
    },
    err => console.error("GPS error", err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

function goOnline() {
  if (!navigator.geolocation) { alert("GPS not supported"); return; }
  enterTaxiDetails();
  if (!taxiNumber) return;

  statusEl.innerText = `🟢 ONLINE - ${taxiNumber}`;
  statusEl.style.background = "#0a7d00";
  statusEl.style.color = "#fff";

  updateLocation();
  gpsInterval = setInterval(updateLocation, 5000);

  listenRequests();
}

function goOffline() {
  if (gpsInterval) clearInterval(gpsInterval);
  firebase.database().ref("drivers/" + driverId).update({
    online: false,
    updatedAt: Date.now()
  });

  statusEl.innerText = "🔴 OFFLINE";
  statusEl.style.background = "#900";
  statusEl.style.color = "#fff";
  activeRequestId = null;
}

function listenRequests() {
  firebase.database().ref("requests").on("value", snapshot => {
    const requests = snapshot.val() || {};

    for (const reqId in requests) {
      const r = requests[reqId];
      if (r.driverId !== driverId) continue;
      if (activeRequestId && activeRequestId !== reqId) continue;

      if (r.status === "pending") {
        requestSound.play();
        const accept = confirm(`Passenger ${r.passengerId} wants a ride. Accept?`);
        if (accept) {
          firebase.database().ref("requests/" + reqId).update({ status: "accepted" });
          activeRequestId = reqId;
          statusEl.innerText = `🟢 ONLINE - ${taxiNumber} (Busy)`;
        } else {
          firebase.database().ref("requests/" + reqId).update({ status: "rejected" });
        }
      }

      if (r.status === "completed" || r.status === "cancelled") {
        if (activeRequestId === reqId) activeRequestId = null;
        statusEl.innerText = `🟢 ONLINE - ${taxiNumber}`;
      }
    }
  });
}