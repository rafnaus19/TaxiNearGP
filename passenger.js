let map, myMarker, requestId = null;

// Init map
navigator.geolocation.getCurrentPosition(pos => {
  map = L.map("map").setView([pos.coords.latitude, pos.coords.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  myMarker = L.circle([pos.coords.latitude, pos.coords.longitude], {radius:30, color:'blue'}).addTo(map);
});

// Hail taxi
document.getElementById("hailBtn").onclick = () => {
  if (requestId) return alert("Already requested");
  requestId = "req_" + Date.now();
  navigator.geolocation.getCurrentPosition(pos => {
    firebase.database().ref("requests/"+requestId).set({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      time: Date.now()
    });
  });
};

// Cancel request
document.getElementById("cancelBtn").onclick = () => {
  if (requestId) {
    firebase.database().ref("requests/"+requestId).remove();
    requestId = null;
  }
};

// Show online drivers
firebase.database().ref("drivers").on("value", snap => {
  snap.forEach(d => {
    const v = d.val();
    L.marker([v.lat, v.lng]).addTo(map)
      .bindPopup(`${v.taxiNumber} (${v.seats} seats)`);
  });
});

// Play sound if driver accepts request
firebase.database().ref("requests").on("child_changed", snap => {
  const r = snap.val();
  if (r.driver && requestId) {
    document.getElementById("acceptedSound").play();
  }
});