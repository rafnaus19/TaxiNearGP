let map;
let driverMarkers = {};
let passengerLatLng = null;

const passengerId = "passenger_" + Math.floor(Math.random()*1000000);
const statusBar = document.getElementById("statusBar");

// Get location and load map
navigator.geolocation.getCurrentPosition(
  pos => initMap(pos.coords.latitude, pos.coords.longitude),
  () => alert("Please allow location access")
);

function initMap(lat, lng){
  passengerLatLng = [lat, lng];

  // Create map
  map = L.map("map").setView(passengerLatLng, 15);

  // Tiles
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  // Passenger marker
  L.circle(passengerLatLng, {
    radius: 50,
    color: "blue",
    fillOpacity: 0.4
  }).addTo(map);

  listenDrivers();
}

// Marker colors
function taxiColor(type){
  if(type === "regular") return "yellow";
  if(type === "luxury") return "gold";
  if(type === "maxi6") return "orange";
  if(type === "maxi12") return "red";
  return "blue";
}

// Listen online taxis
function listenDrivers(){
  firebase.database().ref("drivers").on("value", snapshot => {

    const drivers = snapshot.val() || {};
    let onlineCount = 0;

    for(const id in drivers){
      const d = drivers[id];

      // Remove offline
      if(!d || !d.online){
        if(driverMarkers[id]){
          map.removeLayer(driverMarkers[id]);
          delete driverMarkers[id];
        }
        continue;
      }

      onlineCount++;

      const latlng = [d.lat, d.lng];
      const color = taxiColor(d.taxiType || "regular");

      const popup = `
        <b>🚕 ${d.taxiNumber || id}</b><br>
        Type: ${d.taxiType || "regular"}<br>
        Seats: ${d.seats || 4}<br>
        Wheelchair: ${d.wheelchair ? "Yes" : "No"}<br><br>
        <button onclick="hailTaxi('${id}')">Hail</button>
      `;

      // Update marker
      if(driverMarkers[id]){
        driverMarkers[id].setLatLng(latlng);
        driverMarkers[id].getPopup().setContent(popup);
      } else {
        driverMarkers[id] = L.marker(latlng, {
          icon: L.divIcon({
            html:`<div style="width:18px;height:18px;background:${color};border-radius:50%;border:2px solid white;"></div>`
          })
        }).addTo(map).bindPopup(popup);
      }
    }

    document.getElementById("onlineCount").innerText = "Online taxis: " + onlineCount;
  });
}

// Send request
function hailTaxi(driverId){
  statusBar.innerText = "Status: Requesting...";

  const ref = firebase.database().ref("requests").push();
  ref.set({
    passengerId,
    driverId,
    lat: passengerLatLng[0],
    lng: passengerLatLng[1],
    status: "pending",
    timestamp: Date.now()
  });

  alert("Hail request sent to taxi");
}