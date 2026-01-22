let driverId = localStorage.getItem("driverId");
if(!driverId){ driverId="driver_"+Math.floor(Math.random()*1000000); localStorage.setItem("driverId",driverId);}
const statusEl=document.getElementById("status");
let watchId=null, marker=null, routeLine=null, activeRequestId=null;

// Default taxi info
let taxiInfo={seats:4,type:"regular",taxiNumber:""};

// Map
const map=L.map("map").setView([0,0],2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);

// Sounds
const requestSound=new Audio('assets/sounds/request.mp3');

// Update vehicle info
function updateVehicleInfo(){
  taxiInfo.seats=parseInt(document.getElementById("seats").value);
  taxiInfo.type=document.getElementById("taxiType").value;
  taxiInfo.taxiNumber=document.getElementById("taxiNumber").value || "";
  alert("Vehicle info updated!");
  if(statusEl.textContent==="ONLINE" && marker) firebase.database().ref("drivers/"+driverId).update(taxiInfo);
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
    firebase.database().ref("drivers/"+driverId).set({lat,lng,online:true,updatedAt:Date.now(),...taxiInfo});
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
  activeRequestId=null;
  statusEl.textContent="OFFLINE";
}

function listenForRequests(){
  firebase.database().ref("requests").orderByChild("driverId").equalTo(driverId).on("child_added",snap=>{
    const req=snap.val();
    if(req.status==="pending"){
      if(activeRequestId){ snap.ref.update({status:"rejected"}); return; }
      requestSound.play();
      const accept=confirm(`Hail request!\nPassenger seats: ${req.seats}\nTaxi Number: ${taxiInfo.taxiNumber}\nAccept?`);
      if(accept){
        activeRequestId = snap.key;
        snap.ref.update({status:"accepted"});
        drawRoute(req.passengerLat,req.passengerLng);
      } else snap.ref.update({status:"rejected"});
    }
  });
}

// Complete current ride
function completeRequest(){
  if(activeRequestId){
    firebase.database().ref("requests/"+activeRequestId).update({status:"completed"});
    activeRequestId=null;
    if(routeLine){map.removeLayer(routeLine); routeLine=null;}
    alert("Ride completed");
  }
}

// Draw route driver → passenger
function drawRoute(passLat,passLng){
  if(routeLine) map.removeLayer(routeLine);
  if(marker){
    const driverLatLng=marker.getLatLng();
    routeLine=L.polyline([driverLatLng,[passLat,passLng]],{color:"green"}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[50,50]});
  }
}