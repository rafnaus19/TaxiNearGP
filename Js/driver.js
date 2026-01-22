const driverId = "driver_" + Math.floor(Math.random()*100000);
let map, marker, activeRequest = null;

map = L.map('map').setView([0,0], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

navigator.geolocation.watchPosition(pos=>{
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  if(!marker){
    marker = L.marker([lat,lng]).addTo(map);
    map.setView([lat,lng],16);
  } else {
    marker.setLatLng([lat,lng]);
  }

  db.ref("drivers/"+driverId).update({lat,lng});
});

onlineBtn.onclick = ()=>{
  const taxi = taxiNumber.value;
  if(!taxi.startsWith("T")) return alert("Taxi number must start with T");

  taxiNum.innerText = taxi;

  db.ref("drivers/"+driverId).set({
    online:true,
    taxiNumber: taxi,
    seats:+seats.value,
    type:type.value,
    wheelchair:type.value==="wheelchair",
    activeRide:null
  });
};

offlineBtn.onclick = ()=>{
  db.ref("drivers/"+driverId).remove();
};

db.ref("requests").on("child_added",snap=>{
  const r = snap.val();
  if(r.status==="waiting" && !activeRequest){
    activeRequest = snap.key;
    requestSound.play();

    if(confirm("Accept passenger request?")){
      db.ref("requests/"+snap.key).update({
        status:"accepted",
        driverId
      });
      acceptedSound.play();
    }
  }
});