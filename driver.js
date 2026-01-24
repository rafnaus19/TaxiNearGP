let map;
let driverMarkers = {};
let passengerId = "passenger_" + Math.floor(Math.random()*1000000);
let passengerLatLng;
let activeRequest = null;
let rejectedDrivers = {};
const acceptedSound = new Audio("assets/sounds/accepted.mp3");

// Get passenger location
navigator.geolocation.getCurrentPosition(pos => initMap(pos), () => alert("Please allow location access"));

function initMap(pos){
  passengerLatLng = [pos.coords.latitude, pos.coords.longitude];
  map = L.map("map",{zoomControl:false}).setView(passengerLatLng,15);
  L.control.zoom({position:"bottomright"}).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19}).addTo(map);

  // Show passenger location
  L.circle(passengerLatLng,{radius:60,color:"blue",fillOpacity:0.4}).addTo(map);

  listenDrivers();
  listenRequests();
}

// Listen for online drivers
function listenDrivers(){
  firebase.database().ref("drivers").on("value", snapshot => {
    const drivers = snapshot.val() || {};
    let onlineCount = 0;

    for(const id in drivers){
      const d = drivers[id];
      if(!d || d.online !== true){
        if(driverMarkers[id]){
          map.removeLayer(driverMarkers[id]);
          delete driverMarkers[id];
        }
        continue;
      }

      onlineCount++;
      const latlng = [d.lat, d.lng];

      const popupContent = `
        <b>🚕 ${d.taxiNumber || "Taxi"}</b><br>
        Seats: ${d.seats || "N/A"}<br>
        Type: ${d.taxiType || "regular"}<br>
        Wheelchair: ${d.wheelchair ? "Yes":"No"}<br>
        <button onclick="hailTaxi('${id}')">Hail</button>
        <button onclick="cancelRequest()">Cancel</button>
      `;

      if(driverMarkers[id]){
        driverMarkers[id].setLatLng(latlng);
        driverMarkers[id].getPopup().setContent(popupContent);
      } else {
        driverMarkers[id] = L.marker(latlng)
          .addTo(map)
          .bindPopup(popupContent);
      }
    }

    document.getElementById("onlineCount").innerText = "Online taxis: " + onlineCount;
  });
}

// Send hail request
function hailTaxi(driverId){
  const now = Date.now();

  if(activeRequest){
    alert("You already have an active request!");
    return;
  }

  if(rejectedDrivers[driverId] && now - rejectedDrivers[driverId] < 60000){
    alert("Wait 1 minute before requesting the same driver again.");
    return;
  }

  const requestRef = firebase.database().ref("requests").push();
  activeRequest = {id: requestRef.key, driverId, status:"pending", timestamp: now};

  // Include passenger location for driver heatmap
  requestRef.set({
    passengerId: passengerId,
    driverId: driverId,
    lat: passengerLatLng[0],
    lng: passengerLatLng[1],
    status: "pending",
    timestamp: now
  });

  alert("Request sent!");
}

// Cancel active request
function cancelRequest(){
  if(activeRequest){
    firebase.database().ref("requests/"+activeRequest.id).update({status:"cancelled"});
    activeRequest = null;
    alert("Active request cancelled");
  } else {
    alert("No active request to cancel");
  }
}

// Listen requests updates for this passenger
function listenRequests(){
  firebase.database().ref("requests").on("value", snapshot => {
    const requests = snapshot.val() || {};
    for(const reqId in requests){
      const r = requests[reqId];
      if(r.passengerId !== passengerId) continue;

      // Accepted request
      if(r.status === "accepted" && activeRequest && activeRequest.id === reqId){
        acceptedSound.play();
        alert(`Driver ${r.driverId} accepted your request!`);
      }

      // Completed or cancelled
      if((r.status==="completed" || r.status==="cancelled") && activeRequest && activeRequest.id === reqId){
        activeRequest = null;
      }

      // Rejected by driver
      if(r.status==="rejected" && activeRequest && activeRequest.id === reqId){
        activeRequest = null;
        rejectedDrivers[r.driverId] = Date.now();
        alert(`Driver ${r.driverId} rejected your request. Wait 1 minute to request same driver.`);
      }
    }
  });
}