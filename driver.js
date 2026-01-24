let map;
let driverMarker;
let driverId = "driver_" + Math.floor(Math.random() * 1000000);
let gpsInterval = null;
let activeRequestId = null;
let isOnline = false;

const statusTextEl = document.getElementById("statusText");
const actionButton = document.getElementById("actionButton");
const taxiTypeSelect = document.getElementById("taxiTypeSelect");
const requestSound = new Audio("assets/sounds/request.mp3");

let heatLayer;
let heatPoints = [];
const HEAT_FADE_MINUTES = 10;

// Initialize map
function initMap(lat,lng){
    map = L.map("map",{zoomControl:false}).setView([lat,lng],16);
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19}).addTo(map);
    driverMarker = L.marker([lat,lng]).addTo(map).bindPopup("Your Taxi");
}

// Update driver location
function updateLocation(){
    navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if(!map) initMap(lat,lng);
        else driverMarker.setLatLng([lat,lng]);

        const taxiNumber = prompt("Enter Taxi Number", "T123") || "Taxi"; // or get from previous input if needed
        const seats = 4; // you can add input for seats similarly if needed
        const taxiType = taxiTypeSelect.value;

        firebase.database().ref("drivers/"+driverId).set({
            lat, lng, online:true, taxiNumber, seats, taxiType, updatedAt:Date.now()
        });

    }, err=>console.error("GPS error",err), {enableHighAccuracy:true, maximumAge:0, timeout:10000});
}

// Go Online
function goOnline(){
    isOnline = true;
    const taxiNumber = prompt("Enter Taxi Number", "T123") || "Taxi"; // optional prompt
    statusTextEl.innerText = `🟢 ONLINE - ${taxiNumber}`;
    statusTextEl.style.background = "#0a7d00";
    statusTextEl.style.color = "#fff";
    actionButton.innerText = "Go Offline";
    actionButton.onclick = goOffline;

    updateLocation();
    gpsInterval = setInterval(updateLocation, 5000);
    listenRequests();
}

// Go Offline
function goOffline(){
    isOnline = false;
    if(gpsInterval) clearInterval(gpsInterval);
    firebase.database().ref("drivers/"+driverId).update({online:false,updatedAt:Date.now()});
    statusTextEl.innerText = "🔴 OFFLINE";
    statusTextEl.style.background="#900";
    statusTextEl.style.color="#fff";
    actionButton.innerText = "Go Online";
    actionButton.onclick = goOnline;
    activeRequestId = null;
}

// Cancel active request
function cancelRequest(){
    if(activeRequestId){
        firebase.database().ref("requests/"+activeRequestId).update({status:"cancelled"});
        activeRequestId = null;
        statusTextEl.innerText = `🟢 ONLINE - ${taxiTypeSelect.value}`;
        alert("Request cancelled");
    } else {
        alert("No active request to cancel");
    }
}

// Listen for requests
function listenRequests(){
    firebase.database().ref("requests").on("value", snapshot=>{
        const requests = snapshot.val() || {};
        heatPoints = heatPoints.filter(p=>Date.now()-p.timestamp<HEAT_FADE_MINUTES*60000);

        for(const reqId in requests){
            const r = requests[reqId];

            if(r.status==="pending" && r.lat && r.lng){
                heatPoints.push([r.lat,r.lng,0.5,Date.now()]);
            }

            if(r.driverId !== driverId) continue;
            if(activeRequestId && activeRequestId !== reqId) continue;

            if(r.status==="pending"){
                requestSound.play();
                const accept = confirm(`Passenger ${r.passengerId} wants a ride. Accept?`);
                if(accept){
                    firebase.database().ref("requests/"+reqId).update({status:"accepted"});
                    activeRequestId = reqId;
                    statusTextEl.innerText = `🟢 ONLINE - ${taxiTypeSelect.value} (Busy)`;
                } else {
                    firebase.database().ref("requests/"+reqId).update({status:"rejected"});
                }
            }

            if(r.status==="completed" || r.status==="cancelled"){
                if(activeRequestId===reqId) activeRequestId = null;
                statusTextEl.innerText = `🟢 ONLINE - ${taxiTypeSelect.value}`;
            }
        }
        updateHeatMap();
    });
}

// Update heatmap
function updateHeatMap(){
    if(heatLayer) map.removeLayer(heatLayer);
    const now = Date.now();
    const points = heatPoints.filter(p=>now-p[3]<HEAT_FADE_MINUTES*60000).map(p=>[p[0],p[1],p[2]]);
    heatLayer = L.heatLayer(points,{radius:25,blur:15,maxZoom:17}).addTo(map);
}

// Unload cleanup
window.addEventListener("beforeunload",()=>{firebase.database().ref("drivers/"+driverId).update({online:false});});