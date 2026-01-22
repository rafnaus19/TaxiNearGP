const passengerId = "p_"+Math.floor(Math.random()*100000);
let map, myMarker, requestId=null;

map = L.map('map').setView([0,0],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

navigator.geolocation.getCurrentPosition(pos=>{
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  myMarker = L.circle([lat,lng],{radius:20}).addTo(map);
  map.setView([lat,lng],16);

  hailBtn.onclick = ()=>{
    if(requestId) return alert("Already requested");

    requestId = db.ref("requests").push({
      passengerId,
      lat,lng,
      status:"waiting",
      driverId:null,
      timestamp:Date.now()
    }).key;
  };
});

cancelBtn.onclick = ()=>{
  if(requestId){
    db.ref("requests/"+requestId).remove();
    requestId=null;
  }
};

db.ref("drivers").on("value",snap=>{
  snap.forEach(d=>{
    const v=d.val();
    if(v.online){
      L.marker([v.lat,v.lng]).addTo(map)
        .bindPopup(`Taxi ${v.taxiNumber}<br>Seats: ${v.seats}`);
    }
  });
});