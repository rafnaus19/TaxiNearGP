// Persistent driver ID
let driverId = localStorage.getItem("driverId");
if(!driverId){
  driverId="driver_"+Math.floor(Math.random()*1000000);
  localStorage.setItem("driverId",driverId);
}

const statusEl=document.getElementById("status");
let watchId=null, marker=null;
let taxiInfo={seats:4,type:"regular",wheelchair:false}; // default values
let routeLine=null;

const map=L.map("map").setView([0,0],2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);

const requestSound=new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

// Optional: prompt driver for taxi info on first load
function setTaxiInfo(seats,type,wheelchair){
  taxiInfo={seats,type,wheelchair};
}

function goOnline(){
  if(!navigator.geolocation){alert("GPS not supported"); return;}
  statusEl.textContent="REQUESTING GPS...";
  watchId=navigator.geolocation.watchPosition(pos=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    statusEl.textContent="ONLINE";
    if(!marker) marker=L.marker([lat,lng]).addTo(map);
    else marker.setLatLng([lat,lng]);
    map.setView([lat,lng],16);
    firebase.database().ref("drivers/"+driverId).set({
      lat,lng,online:true,updatedAt:Date.now(),...taxiInfo
    });
  },err=>{statusEl.textContent="GPS DENIED"; alert(err.message);},{enableHighAccuracy:true});
  listenForRequests();
}

function goOffline(){
  if(watchId!==null) navigator.geolocation.clearWatch(watchId);
  watchId=null;
  firebase.database().ref("drivers/"+driverId).remove();
  firebase.database().ref("requests").orderByChild("driverId").equalTo(driverId).once("value",snap=>{
    snap.forEach(r=>r.ref.remove());
  });
  if(marker){map.removeLayer(marker); marker=null;}
  if(routeLine){map.removeLayer(routeLine); routeLine=null;}
  statusEl.textContent="OFFLINE";
}

// Listen for passenger requests
function listenForRequests(){
  firebase.database().ref("requests").orderByChild("driverId").equalTo(driverId).on("child_added",snap=>{
    const req=snap.val();
    if(req.status==="pending"){
      requestSound.play();
      const accept=confirm(`Hail request!\nSeats: ${req.seats || 'unknown'}\nAccept?`);
      if(accept){
        snap.ref.update({status:"accepted"});
        drawRoute(req.passengerLat,req.passengerLng);
      } else snap.ref.update({status:"rejected"});
    }
  });
}

// Draw polyline from driver → passenger
function drawRoute(passLat,passLng){
  if(routeLine) map.removeLayer(routeLine);
  if(marker){
    const driverLatLng=marker.getLatLng();
    routeLine=L.polyline([driverLatLng,[passLat,passLng]],{color:"green"}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[50,50]});
  }
}