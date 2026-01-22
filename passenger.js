let map, myMarker, requestId = null;
let driverMarkers = {};

// Init map
navigator.geolocation.getCurrentPosition(pos => {
  map = L.map("map").setView([pos.coords.latitude, pos.coords.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  myMarker = L.circle([pos.coords.latitude, pos.coords.longitude], {
    radius: 30,
    color: 'blue',
    fillOpacity: 0.5
  }).addTo(map);
});

// Fetch drivers
firebase.database().ref("drivers").on("value", snap => {
  // Clear old markers
  for (let id in driverMarkers) {
    map.removeLayer(driverMarkers[id]);
  }
  driverMarkers = {};

  snap.forEach(d => {
    const v = d.val();
    if (v.online) {
      // Create popup content with Hail button inside
      const popupContent = document.createElement("div");
      popupContent.innerHTML = `
        Taxi: ${v.taxiNumber}<br>
        Seats: ${v.seats}<br>
        Type: ${v.type}<br>
      `;
      const hailBtn = document.createElement("button");
      hailBtn.textContent = "Hail";
      hailBtn.style.marginTop = "5px";
      hailBtn.style.width = "100%";
      hailBtn.onclick = () => hailDriver(d.key);
      popupContent.appendChild(hailBtn);

      // Add marker
      const m = L.marker([v.lat, v.lng]).addTo(map).bindPopup(popupContent);
      driverMarkers[d.key] = m;
    }
  });
});

// Function to hail specific driver
function hailDriver(driverId) {
  if (requestId) return alert("You already requested a taxi!");
  const passengerId = "passenger_" + Date.now();
  requestId = "req_" + Date.now();

  navigator.geolocation.getCurrentPosition(pos => {
    firebase.database().ref("requests/" + requestId).set({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      time: Date.now(),
      passenger: passengerId,
      driver: driverId
    });
  });

  alert("Request sent to taxi!");
}

// Listen for driver acceptance
firebase.database().ref("requests").on("child_changed", snap => {
  const r = snap.val();
  if (requestId && r.driver) {
    document.getElementById("acceptedSound").play();
    alert(`Taxi ${r.driver} accepted your request!`);
  }
});