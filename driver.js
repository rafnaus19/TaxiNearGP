let map, driverMarker;
let driverId = "driver_" + Math.floor(Math.random()*1000000);
let gpsInterval=null, activeRequest=null, isOnline=false, taxiInfo=null;
let passengerPolyline=null;

const statusTextEl = document.getElementById("statusText");
const toggleBtn = document.getElementById("toggleOnline");
const cancelBtn = document.getElementById("cancelRequestBtn");

const taxiModal = document.getElementById("taxiModal");
const taxiNumberInput = document.getElementById("taxiNumberInput");
const taxiTypeSelect = document.getElementById("taxiTypeSelect");
const seatsInput = document.getElementById("seatsInput");
const wheelchairSelect = document.getElementById("wheelchairSelect");
const taxiSubmitBtn = document.getElementById("taxiSubmitBtn");

navigator.geolocation.getCurrentPosition(pos=>initMap(pos.coords.latitude,pos.coords.longitude), ()=>alert("Allow location access"));

function initMap(lat,lng){
    map = L.map("map",{zoomControl:false}).setView([lat,lng],16);
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19}).addTo(map);
    driverMarker = L.marker([lat,lng]).addTo(map).bindPopup("Your Taxi");
}

function updateLocation(){
    navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if(driverMarker) driverMarker.setLatLng([lat,lng]);
        if(isOnline && taxiInfo) firebase.database().ref("drivers/"+driverId).update({...taxiInfo,lat,lng,online:true,updatedAt:Date.now()});
        if(activeRequest && passengerPolyline){
            const latlngs=[ [lat,lng], passengerPolyline.getLatLngs()[1] ];
            passengerPolyline.setLatLngs(latlngs);
        }
    });
}

toggleBtn.onclick=()=>{
    if(!isOnline){ if(!taxiInfo){ taxiModal.style.display="flex"; return; } goOnline(); } 
    else goOffline();
};

taxiSubmitBtn.onclick=()=>{
    const taxiNumber=taxiNumberInput.value.trim();
    if(!taxiNumber){ alert("Enter Taxi Number"); return; }
    taxiInfo={taxiNumber,taxiType:taxiTypeSelect.value,seats:parseInt(seatsInput.value)||4,wheelchair:wheelchairSelect.value==="true"};
    taxiModal.style.display="none"; goOnline();
};

function goOnline(){
    isOnline=true; statusTextEl.innerText=`🟢 ONLINE - ${taxiInfo.taxiNumber}`; toggleBtn.innerText="Go Offline";
    cancelBtn.style.display="none";
    navigator.geolocation.getCurrentPosition(pos=>{
        const lat=pos.coords.latitude, lng=pos.coords.longitude;
        driverMarker.setLatLng([lat,lng]);
        firebase.database().ref("drivers/"+driverId).set({...taxiInfo,lat,lng,online:true,updatedAt:Date.now()});
    });
    gpsInterval=setInterval(updateLocation,5000);
    listenRequests();
}

function goOffline(){
    isOnline=false; if(gpsInterval) clearInterval(gpsInterval);
    firebase.database().ref("drivers/"+driverId).update({online:false,updatedAt:Date.now()});
    statusTextEl.innerText="🔴 OFFLINE"; toggleBtn.innerText="Go Online";
    cancelBtn.style.display="none"; activeRequest=null;
    if(passengerPolyline){ map.removeLayer(passengerPolyline); passengerPolyline=null; }
}

cancelBtn.onclick=()=>{
    if(activeRequest){
        firebase.database().ref("requests/"+activeRequest).update({status:"cancelled"});
        activeRequest=null; cancelBtn.style.display="none";
        statusTextEl.innerText=`🟢 ONLINE - ${taxiInfo.taxiNumber}`;
        if(passengerPolyline){ map.removeLayer(passengerPolyline); passengerPolyline=null; }
        alert("Request cancelled");
    }
};

function computeDistance(lat1,lon1,lat2,lon2){
    const R=6371e3, φ1=lat1*Math.PI/180, φ2=lat2*Math.PI/180;
    const Δφ=(lat2-lat1)*Math.PI/180, Δλ=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c=2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
}

function listenRequests(){
    firebase.database().ref("requests").on("value",snapshot=>{
        const requests=snapshot.val()||{};
        for(const reqId in requests){
            const r=requests[reqId]; if(r.driverId!==driverId) continue;
            if(activeRequest && activeRequest!==reqId) continue;

            if(r.status==="pending"){
                const accept=confirm(`Passenger ${r.passengerId} wants a ride. Accept?`);
                if(accept){
                    firebase.database().ref("requests/"+reqId).update({status:"accepted"});
                    activeRequest=reqId; statusTextEl.innerText=`🟢 ONLINE - ${taxiInfo.taxiNumber} (Busy)`; cancelBtn.style.display="inline-block";

                    passengerPolyline=L.polyline([[driverMarker.getLatLng().lat,driverMarker.getLatLng().lng],[r.lat,r.lng]],{color:"blue"}).addTo(map);

                    const etaInterval=setInterval(()=>{
                        if(!activeRequest || !passengerPolyline){ clearInterval(etaInterval); return; }
                        const driverPos=driverMarker.getLatLng();
                        const dist=computeDistance(driverPos.lat,driverPos.lng,r.lat,r.lng);
                        const etaMin=Math.round(dist/666.66);
                        statusTextEl.innerText=`🟢 ONLINE - ${taxiInfo.taxiNumber} (Busy) | ETA: ${etaMin} min`;
                    },5000);
                } else firebase.database().ref("requests/"+reqId).update({status:"rejected"});
            }

            if(r.status==="completed"||r.status==="cancelled"){
                if(activeRequest===reqId) activeRequest=null; cancelBtn.style.display="none";
                statusTextEl.innerText=`🟢 ONLINE - ${taxiInfo.taxiNumber}`;
                if(passengerPolyline){ map.removeLayer(passengerPolyline); passengerPolyline=null; }
            }
        }
    });
}

window.addEventListener("beforeunload",()=>{firebase.database().ref("drivers/"+driverId).update({online:false});});