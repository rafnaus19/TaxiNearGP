let map,myMarker,requestId=null;
let driverMarkers={};

// Init map
navigator.geolocation.getCurrentPosition(pos=>{
  map = L.map("map").setView([pos.coords.latitude,pos.coords.longitude],15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  myMarker=L.circle([pos.coords.latitude,pos.coords.longitude],{radius:30,color:'blue',fillOpacity:0.5}).addTo(map);
});

// Update online drivers
function updateDrivers(snapshot){
  const drivers = snapshot.val()||{};
  let onlineCount=0;

  for(let id in driverMarkers){
    map.removeLayer(driverMarkers[id]);
  }
  driverMarkers={};

  for(let id in drivers){
    const v=drivers[id];
    if(!v) continue;
    const isOnline = (v.online===true || v.online==="true");
    const lat=parseFloat(v.lat);
    const lng=parseFloat(v.lng);
    if(!isOnline || isNaN(lat) || isNaN(lng)) continue;

    onlineCount++;

    const popup=document.createElement("div");
    popup.innerHTML=`Taxi: ${v.taxiNumber}<br>Seats: ${v.seats}<br>Type: ${v.type}`;
    const hailBtn=document.createElement("button");
    hailBtn.textContent="Hail";
    hailBtn.onclick=()=>hailDriver(id);
    popup.appendChild(hailBtn);

    const marker=L.marker([lat,lng]).addTo(map).bindPopup(popup);
    driverMarkers[id]=marker;
  }

  document.getElementById("onlineCount").textContent=`Online taxis: ${onlineCount}`;
}

firebase.database().ref("drivers").on("value",updateDrivers);

// Hail driver
function hailDriver(driverId){
  if(requestId) return alert("You already requested a taxi!");
  navigator.geolocation.getCurrentPosition(pos=>{
    requestId="req_"+Date.now();
    const passengerId="passenger_"+Date.now();

    firebase.database().ref("requests/"+requestId).set({
      lat:pos.coords.latitude,
      lng:pos.coords.longitude,
      time:Date.now(),
      passenger:passengerId,
      driver:driverId
    });

    alert("Request sent to Taxi "+driverId);
  });
}

// Listen for acceptance
firebase.database().ref("requests").on("child_changed",snap=>{
  const r=snap.val();
  if(requestId && r.driver){
    document.getElementById("acceptedSound").play();
    alert(`Taxi ${r.driver} accepted your request!`);
  }
});

// Listen for cancel
firebase.database().ref("requests").on("child_removed",snap=>{
  if(requestId && snap.key===requestId){
    requestId=null;
    alert("Your taxi request was cancelled.");
  }
});