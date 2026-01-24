let map;
let driverMarkers = {};
let passengerId = "passenger_" + Math.floor(Math.random()*1000000);
let passengerLatLng;
let activeRequest = null;
let rejectedDrivers = {};
const acceptedSound = new Audio("assets/sounds/accepted.mp3");

navigator.geolocation.getCurrentPosition(pos => initMap(pos), () => alert("Please allow location access"));

function initMap(pos){
  passengerLatLng = [pos.coords.latitude, pos.coords.longitude];
  map = L.map("map",{zoomControl:false}).setView(passengerLatLng,15);
  L.control.zoom({position:"bottomright"}).addTo(map);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19}).addTo(map);

  L.circle(passengerLatLng,{radius:60,color:"blue",fillOpacity:0.4}).addTo(map);

  listenDrivers();
  listenRequests();
}

function getMarkerColor(type){
  switch(type){
    case "regular": return "yellow";
    case "luxury": return "gold";
    case "maxi6": return "orange";
    case "maxi12": return "red";
    default: return "blue";
  }
}

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
      const wheelchairText = d.wheelchair ? "Yes" : "No";
      const color = getMarkerColor(d.taxiType);

      const now = Date.now();
      const isRejected = rejectedDrivers[id] && now - rejectedDrivers[id] < 60000;
      const hailButton = activeRequest || isRejected ? `<button disabled>Hail</button>` : `<button onclick="hailTaxi('${id}')">Hail</button>`;

      const popupContent = `
        <b style="color:${color}">🚕 ${d.taxiNumber || "Taxi"}</b><br>
        Seats: ${d.seats || "N/A"}<br>
        Type: ${d.taxiType || "regular"}<br>
        Wheelchair: ${wheelchairText}<br>
        ${hailButton}
      `;

      if(driverMarkers[id]){
        driverMarkers[id].setLatLng(latlng);
        driverMarkers[id].getPopup().setContent(popupContent);
      } else {
        driverMarkers[id] = L.marker(latlng,{
          icon: L.divIcon({className:"driverMarker",html:`<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid #fff;"></div>`})
        })
        .addTo(map)
        .bindPopup(popupContent);
      }
    }

    document.getElementById("onlineCount").innerText = "Online taxis: " + onlineCount;
  });
}

function listenRequests(){
  firebase.database().ref("requests").on("value", snapshot=>{
    const requests = snapshot.val() || {};
    activeRequest = null;

    for(const reqId in requests){
      const r = requests[reqId];
      if(r.passengerId !== passengerId) continue;

      if(r.status==="pending" || r.status==="accepted"){
        activeRequest = r.driverId;
      }

      if(r.status==="accepted"){
        acceptedSound.play();
        alert("Your request was accepted by driver " + r.driverId);
      }

      if(r.status==="rejected"){
        rejectedDrivers[r.driverId] = Date.now();
        if(activeRequest === r.driverId) activeRequest = null;
        alert("Driver " + r.driverId + " rejected your request. Wait 1 minute to request same driver.");
      }

      if(r.status==="cancelled" || r.status==="completed"){
        if(activeRequest === r.driverId) activeRequest = null;
      }
    }

    // refresh popups
    for(const id in driverMarkers){
      const dRef = firebase.database().ref("drivers/"+id);
      dRef.once("value").then(snap=>{
        const d = snap.val();
        if(!d) return;
        const latlng = [d.lat, d.lng];
        const wheelchairText = d.wheelchair ? "Yes" : "No";
        const color = getMarkerColor(d.taxiType);
        const now = Date.now();
        const isRejected = rejectedDrivers[id] && now - rejectedDrivers[id] < 60000;
        const hailButton = activeRequest || isRejected ? `<button disabled>Hail</button>` : `<button onclick="hailTaxi('${id}')">Hail</button>`;

        const popupContent = `
          <b style="color:${color}">🚕 ${d.taxiNumber || "Taxi"}</b><br>
          Seats: ${d.seats || "N/A"}<br>
          Type: ${d.taxiType || "regular"}<br>
          Wheelchair: ${wheelchairText}<br>
          ${hailButton}
        `;
        driverMarkers[id].getPopup().setContent(popupContent);
      });
    }
  });
}

function hailTaxi(driverId){
  const now = Date.now();
  if(activeRequest){
    alert("You already have an active request. Wait until completed or cancelled.");
    return;
  }
  if(rejectedDrivers[driverId] && now - rejectedDrivers[driverId] < 60000){
    alert("You must wait 1 minute to request this driver again.");
    return;
  }

  const requestRef = firebase.database().ref("requests").push();
  requestRef.set({
    passengerId: passengerId,
    driverId: driverId,
    status: "pending",
    lat: passengerLatLng[0],
    lng: passengerLatLng[1],
    timestamp: Date.now()
  });
  activeRequest = driverId;
  alert("Request sent to driver " + driverId);
}