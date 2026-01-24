let map;
let driverMarker;
let driverId = "driver_" + Math.floor(Math.random()*1000000);
let gpsInterval = null;
let activeRequest = null;
let isOnline = false;
let taxiInfo = null;

const statusTextEl = document.getElementById("statusText");
const toggleBtn = document.getElementById("toggleOnline");
const cancelBtn = document.getElementById("cancelRequestBtn");

const taxiModal = document.getElementById("taxiModal");
const taxiNumberInput = document.getElementById("taxiNumberInput");
const taxiTypeSelect = document.getElementById("taxiTypeSelect");
const seatsInput = document.getElementById("seatsInput");
const wheelchairSelect = document.getElementById("wheelchairSelect");
const taxiSubmitBtn = document.getElementById("taxiSubmitBtn");

// Initialize map
function initMap(lat,lng){
    map = L.map("map",{zoomControl:false}).setView([lat,lng],16);
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:19}).addTo(map);
    driverMarker = L.marker([lat,lng]).addTo(map).bindPopup("Your Taxi");
}

// Update location to Firebase
function updateLocation(){
    navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if(!map) initMap(lat,lng);
        else driverMarker.setLatLng([lat,lng]);

        firebase.database().ref("drivers/"+driverId).update({
            lat, lng, online:true, updatedAt:Date.now()
        });
    }, err=>console.error(err), {enableHighAccuracy:true, maximumAge:0, timeout:10000});
}

// Go Online workflow
toggleBtn.onclick = () => {
    if(!isOnline){
        if(!taxiInfo){
            taxiModal.style.display = "flex"; // show modal
            return;
        }
        goOnline();
    } else {
        goOffline();
    }
};

// Submit taxi info modal
taxiSubmitBtn.onclick = () => {
    const taxiNumber = taxiNumberInput.value.trim();
    const taxiType = taxiTypeSelect.value;
    const seats = parseInt(seatsInput.value) || 4;
    const wheelchair = wheelchairSelect.value === "true";

    if(!taxiNumber){
        alert("Please enter Taxi Number");
        return;
    }

    taxiInfo = {taxiNumber, taxiType, seats, wheelchair};
    taxiModal.style.display = "none";
    goOnline();
};

function goOnline(){
    isOnline = true;
    statusTextEl.innerText = `🟢 ONLINE - ${taxiInfo.taxiNumber}`;
    statusTextEl.style.background = "#0a7d00"; statusTextEl.style.color="#fff";
    toggleBtn.innerText = "Go Offline";

    cancelBtn.style.display = "none";

    // Save initial driver info
    navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if(!map) initMap(lat,lng);
        else driverMarker.setLatLng([lat,lng]);

        firebase.database().ref("drivers/"+driverId).set({
            ...taxiInfo,
            lat, lng,
            online:true,
            updatedAt:Date.now()
        });

    }, err=>console.error(err), {enableHighAccuracy:true, maximumAge:0, timeout:10000});

    gpsInterval = setInterval(updateLocation,5000);
    listenRequests();
}

function goOffline(){
    isOnline = false;
    if(gpsInterval) clearInterval(gpsInterval);
    firebase.database().ref("drivers/"+driverId).update({online:false, updatedAt:Date.now()});
    statusTextEl.innerText = "🔴 OFFLINE";
    statusTextEl.style.background = "#900"; statusTextEl.style.color="#fff";
    toggleBtn.innerText = "Go Online";
    cancelBtn.style.display = "none";
    activeRequest = null;
}

// Cancel active request
cancelBtn.onclick = () => {
    if(activeRequest){
        firebase.database().ref("requests/"+activeRequest).update({status:"cancelled"});
        activeRequest = null;
        cancelBtn.style.display = "none";
        statusTextEl.innerText = `🟢 ONLINE - ${taxiInfo.taxiNumber}`;
        alert("Request cancelled");
    }
};

// Listen for requests
function listenRequests(){
    firebase.database().ref("requests").on("value", snapshot=>{
        const requests = snapshot.val() || {};

        for(const reqId in requests){
            const r = requests[reqId];
            if(r.driverId !== driverId) continue;
            if(activeRequest && activeRequest!==reqId) continue;

            if(r.status==="pending"){
                const accept = confirm(`Passenger ${r.passengerId} wants a ride. Accept?`);
                if(accept){
                    firebase.database().ref("requests/"+reqId).update({status:"accepted"});
                    activeRequest = reqId;
                    statusTextEl.innerText = `🟢 ONLINE - ${taxiInfo.taxiNumber} (Busy)`;
                    cancelBtn.style.display = "inline-block";
                } else {
                    firebase.database().ref("requests/"+reqId).update({status:"rejected"});
                }
            }

            if(r.status==="completed" || r.status==="cancelled"){
                if(activeRequest===reqId) activeRequest=null;
                cancelBtn.style.display = "none";
                statusTextEl.innerText = `🟢 ONLINE - ${taxiInfo.taxiNumber}`;
            }
        }
    });
}

// Cleanup on unload
window.addEventListener("beforeunload",()=>{firebase.database().ref("drivers/"+driverId).update({online:false});});