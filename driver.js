const driverId = "driver_" + Math.floor(Math.random() * 100000);
let watchId = null;
let marker = null;

const map = L.map("map").setView([0, 0], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

function goOnline() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (!marker) {
        marker = L.marker([lat, lng]).addTo(map);
      } else {
        marker.setLatLng([lat, lng]);
      }

      map.setView([lat, lng], 16);

      firebase.database().ref("drivers/" + driverId).set({
        lat,
        lng,
        online: true,
        time: Date.now()
      });
    },
    err => alert(err.message),
    { enableHighAccuracy: true }
  );
}

function goOffline() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  firebase.database().ref("drivers/" + driverId).remove();
  alert("You are OFFLINE");
}