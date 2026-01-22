const map=L.map("map").setView([0,0],2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);

const countEl=document.getElementById("count");
let driverMarkers={},passengerMarker=null,routeLine=null;
const hailSound=new Audio('assets/sounds/accepted.mp3');
let passengerId="passenger_"+Math.floor(Math.random()*1000000);
let activeRequestId=null;

// Passenger location + 500m radius
navigator.geolocation.getCurrentPosition(pos=>{
  const lat=pos.coords.latitude,lng=pos.coords.longitude;
  passengerMarker=L.circleMarker([lat,lng],{radius:8,color:"blue",fillColor:"blue",fillOpacity:0.8}).addTo(map);
  map.setView([lat,lng],15);
  L.circle([lat,lng],{radius:500,color:"red",fillOpacity:0.1}).addTo(map);
  firebase.database().ref("passengers").child(passengerId).set({lat,lng,timestamp:Date.now()});
},err=>alert(err.message),{enableHighAccuracy:true});

// Taxi type colors
const taxiColors={regular:"yellow",maxi:"orange",luxury:"purple",wheelchair:"blue"};

// Live drivers
firebase.database().ref("drivers").on("value",snap=>{
  const drivers=snap.val()||{};
  countEl.textContent=Object.keys(drivers).length;

  Object.keys(driverMarkers).forEach(id=>{
    if(!drivers[id]){ map.removeLayer(driverMarkers[id]); delete driverMarkers[id]; }
  });

  Object.keys(drivers).forEach(id=>{
    const d=drivers[id];
    const color=taxiColors[d.type]||"yellow";
    if(!driverMarkers[id]){
      const m=L.circleMarker([d.lat,d.lng],{radius:8,color,color,fillColor:color,fillOpacity:0.8}).addTo(map);
      m.on("click",()=>showDriverInfo(id,d));
      driverMarkers[id]=m;
    } else driverMarkers[id].setLatLng([d.lat,d.lng]);
  });
});

// Show info + hail
function showDriverInfo(id,d){
  if(!passengerMarker){alert("Waiting GPS"); return;}
  const popupContent = `
    <b>Taxi Number:</b> ${d.taxiNumber}<br>
    <b>Seats:</b> ${d.seats}<br>
    <b>Type:</b> ${d.type}<br>
    <button onclick="hailDriver('${id}',${d.lat},${d.lng},${d.seats},'${d.type}','${d.wheelchair}')">Hail</button>
  `;
  driverMarkers[id].bindPopup(popupContent).openPopup();
}

// Hail function
function hailDriver(driverId,driverLat,driverLng,seats,type,wheelchair){
  if(!passengerMarker){alert("Waiting GPS"); return;}
  if(activeRequestId){alert("You already have an active request"); return;}

  const reqRef=firebase.database().ref("requests").push();
  reqRef.set({
    passengerId,
    passengerLat:passengerMarker.getLatLng().lat,
    passengerLng:passengerMarker.getLatLng().lng,
    driverId,
    seats,type,wheelchair,
    status:"pending",
    timestamp:Date.now()
  });
  activeRequestId=reqRef.key;

  reqRef.on("value",snap=>{
    const r=snap.val();
    if(r.status==="accepted"){
      hailSound.play();
      alert("Driver accepted your request!");
      drawRoute(driverLat,driverLng);
    } else if(r.status==="rejected"){
      alert("Driver rejected your request");
      activeRequestId=null; reqRef.off();
    } else if(r.status==="completed" || r.status==="cancelled"){
      alert("Ride completed or cancelled");
      activeRequestId=null;
      if(routeLine){map.removeLayer(routeLine); routeLine=null;}
      reqRef.off();
    }
  });
}

// Draw route passenger → driver
function drawRoute(driverLat,driverLng){
  if(routeLine) map.removeLayer(routeLine);
  if(passengerMarker){
    routeLine=L.polyline([passengerMarker.getLatLng(),[driverLat,driverLng]],{color:"green"}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[50,50]});
  }
}

// Optional: cancel ride
function cancelRequest(){
  if(activeRequestId){
    firebase.database().ref("requests/"+activeRequestId).update({status:"cancelled"});
    activeRequestId=null;
    if(routeLine){map.removeLayer(routeLine); routeLine=null;}
  }
}