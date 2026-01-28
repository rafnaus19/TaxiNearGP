// ===== DRIVER.JS =====

let map;
let driverMarker = null;
let passengerMarker = null;
let watchId = null;

let driverId = localStorage.getItem("driverId");
if (!driverId) {
  driverId = "driver_" + Math.floor(Math.random() * 1000000);
  localStorage.setItem("driverId", driverId);
}

let isOnline = false;
let activeRequestId = null;

// ================= MAP =================
map = L.map("map").setView([0, 0], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ================= GEOLOCATION =================
function startLocationUpdates() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!driverMarker) {
        driverMarker = L.marker([lat, lng]).addTo(map)
          .bindPopup("🚕 You");
        map.setView([lat, lng], 15);
      } else {
        driverMarker.setLatLng([lat, lng]);
      }

      if (isOnline) {
        firebase.database().ref("drivers/" + driverId).update({
          lat,
          lng,
          online: true,
          updatedAt: Date.now()
        });
      }
    },
    err => console.error(err),
    { enableHighAccuracy: true }
  );
}

// ================= ONLINE / OFFLINE =================
document.getElementById("goOnline").onclick = () => {
  const taxiNumber = document.getElementById("taxiNumber").value.trim();
  const taxiType = document.getElementById("taxiType").value;
  const seats = document.getElementById("seats").value;
  const wheelchair = document.getElementById("wheelchair").checked;

  if (!taxiNumber) {
    alert("Enter taxi number");
    return;
  }

  isOnline = true;

  firebase.database().ref("drivers/" + driverId).set({
    taxiNumber,
    taxiType,
    seats,
    wheelchair,
    online: true,
    updatedAt: Date.now()
  });

  document.getElementById("status").innerText =
    `ONLINE • ${taxiNumber}`;

  document.getElementById("goOnline").style.display = "none";
  document.getElementById("goOffline").style.display = "inline-block";

  startLocationUpdates();
  listenForRequests();
};

document.getElementById("goOffline").onclick = () => {
  isOnline = false;

  firebase.database().ref("drivers/" + driverId).update({
    online: false
  });

  document.getElementById("status").innerText = "OFFLINE";

  document.getElementById("goOnline").style.display = "inline-block";
  document.getElementById("goOffline").style.display = "none";

  if (watchId) navigator.geolocation.clearWatch(watchId);
};

// ================= LISTEN FOR HAIL REQUESTS =================
function listenForRequests() {
  firebase.database()
    .ref("requests")
    .orderByChild("driverId")
    .equalTo(driverId)
    .on("child_added", snap => {

      if (activeRequestId) return;

      const req = snap.val();
      activeRequestId = snap.key;

      new Audio("assets/sounds/request.mp3").play();

      // Passenger marker
      if (passengerMarker) map.removeLayer(passengerMarker);

      passengerMarker = L.marker([req.lat, req.lng], {
        icon: L.icon({
          iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
          iconSize: [32, 32]
        })
      }).addTo(map)
        .bindPopup("🧍 Passenger")
        .openPopup();

      map.setView([req.lat, req.lng], 16);

      document.getElementById("cancelRequest").style.display = "inline-block";
      document.getElementById("status").innerText =
        `BUSY • ${req.taxiNumber || ""}`;
    });
}

// ================= CANCEL REQUEST =================
document.getElementById("cancelRequest").onclick = () => {
  if (!activeRequestId) return;

  firebase.database().ref("requests/" + activeRequestId).remove();
  activeRequestId = null;

  if (passengerMarker) {
    map.removeLayer(passengerMarker);
    passengerMarker = null;
  }

  document.getElementById("cancelRequest").style.display = "none";
  document.getElementById("status").innerText = "ONLINE";

};

// ================= CLEANUP ON CLOSE =================
window.addEventListener("beforeunload", () => {
  firebase.database().ref("drivers/" + driverId).update({
    online: false
  });
});