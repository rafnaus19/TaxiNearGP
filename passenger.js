// passenger.js
let map, myMarker, requestId = null;
let driverMarkers = {};

navigator.geolocation.getCurrentPosition(pos => {
  map = L.map("map").setView([pos.coords.latitude, pos.coords.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  myMarker = L.circle([pos.coords.latitude, pos.coords.longitude], {
    radius: 30, color:'blue', fillOpacity:0.5
  }).addTo(map);
});

function updateDrivers(snapshot){
  const drivers = snapshot.val() || {};
  let onlineCount = 0;

  for (let id in driverMarkers){
    map.removeLayer(driverMarkers[id]);
  }
  driverMarkers = {};

  for (let id in drivers){
    const v = drivers[id];
    const isOnline = (v.online === true || v.online === "true");
    const lat = parseFloat(v.lat);
    const lng = parseFloat(v.lng);

    if (isOnline && !isNaN(lat) && !isNaN(lng)){
      onlineCount++;

      const popupContent = document.createElement("div");
      popupContent.innerHTML = `Taxi: ${v.taxiNumber}<br>Seats: ${v.seats}<br>Type: ${v.type}`;
      const hailBtn = document.createElement("button");
      hailBtn.textContent = "Hail";
      hailBtn.onclick = ()=> hailDriver(id);
      popupContent.appendChild(hailBtn);

      const m = L.marker([lat, lng]).addTo(map).bindPopup(popupContent);
      driverMarkers[id] = m;
    }
  }

  document.getElementById("onlineCount").textContent = `Online taxis: ${onlineCount}`;
}

firebase.database().ref("drivers").on("value", updateDrivers);

function hailDriver(driverId){
  if (requestId) return alert("Already requested a taxi!");
  navigator.geolocation.getCurrentPosition(pos => {
    requestId = "req_" + Date.now();
    const passengerId = "passenger_" + Date.now();

    firebase.database().ref("requests/" + requestId).set({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      time: Date.now(),
      passenger: passengerId,
      driver: driverId
    });

    alert("Request sent to Taxi " + driverId);
  });
}

firebase.database().ref("requests").on("child_changed", snap=>{
  const r = snap.val();
  if (requestId && r.driver){
    document.getElementById("acceptedSound").play();
    alert(`Taxi ${r.driver} accepted your request!`);
  }
});

firebase.database().ref("requests").on("child_removed", snap=>{
  if (requestId && snap.key === requestId){
    requestId = null;
    alert("Your taxi request was cancelled.");
  }
});