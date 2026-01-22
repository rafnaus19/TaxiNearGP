const map=L.map("map").setView([0,0],2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(map);

const countEl=document.getElementById("count");
let driverMarkers={},passengerMarker=null;
const hailSound=new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
let passengerId="passenger_"+Math.floor(Math.random()*1000000);

// Heat map radius
let heatCircle=null;

// Taxi colors by type
const taxiColors={regular:"yellow",maxi:"orange",luxury:"purple",wheelchair:"blue"};

navigator.geolocation.getCurrentPosition(pos=>{
  const lat=pos.coords.latitude,lng=pos.coords.longitude;
  passengerMarker=L.circleMarker([lat,lng],{radius:8,color:"blue",fillColor:"blue",fillOpacity:0.8}).addTo(map);
  map.setView([lat,lng],15);

  // draw 500m radius circle
  heatCircle=L.circle([lat,lng],{radius:500,color:"red",fillOpacity:0.1}).addTo(map);

  // count passengers in same circle (simplified)
  firebase.database().ref("passengers").child(passengerId).set({lat,lng,timestamp:Date.now()});
},err=>alert(err.message),{enableHighAccuracy:true});

// live drivers
firebase.database().ref("drivers").on("value",snap=>{
  const drivers=snap.val()||{};
  countEl.textContent=Object.keys(drivers).length;

  Object.keys(driverMarkers).forEach(id=>{
    if(!drivers[id]){
      map.removeLayer(driverMarkers[id]);
      delete driverMarkers[id];
    }
  });

  Object.keys(drivers).forEach(id=>{
    const d=drivers[id];
    const color=taxiColors[d.type]||"yellow";
    if(!driverMarkers[id]){
      const m=L.circleMarker([d.lat,d.lng],{radius:8,color,color,fillColor:color,fillOpacity:0.8}).addTo(map);
      m.on("click",()=>hailDriver(id,d.lat,d.lng,d.seats,d.type,d.wheelchair));
      driverMarkers[id]=m;
    } else driverMarkers[id].setLatLng([d.lat,d.lng]);
  });
});

// Hail function
function hailDriver(driverId,lat,lng,seats,type,wheelchair){
  if(!passengerMarker){alert("Waiting for GPS"); return;}
  const reqRef=firebase.database().ref("requests").push();
  reqRef.set({
    passengerId,
    passengerLat:passengerMarker.getLatLng().lat,
    passengerLng:passengerMarker.getLatLng().lng,
    driverId,
    seats,
    type,
    wheelchair,
    status:"pending",
    timestamp:Date.now()
  });

  reqRef.on("value",snap=>{
    const r=snap.val();
    if(r.status==="accepted"){
      hailSound.play();
      alert(`Driver accepted your request!`);
      drawRoute(lat,lng);
      reqRef.off();
    } else if(r.status==="rejected"){
      alert("Driver rejected your request");
      reqRef.off();
    }
  });
}

// Draw route line passenger → driver
let routeLine=null;
function drawRoute(driverLat,driverLng){
  if(routeLine) map.removeLayer(routeLine);
  if(passengerMarker){
    const pLatLng=passengerMarker.getLatLng();
    routeLine=L.polyline([pLatLng,[driverLat,driverLng]],{color:"green"}).addTo(map);
    map.fitBounds(routeLine.getBounds(),{padding:[50,50]});
  }
}