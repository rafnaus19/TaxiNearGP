let map, driverMarkers = {}, passengerLatLng, activeRequest = null, rejectedDrivers = {}, passengerPolyline = null;
const passengerId = "passenger_" + Math.floor(Math.random() * 1000000);
const statusBar = document.getElementById("statusBar");
const acceptedSound = new Audio("assets/sounds/accepted.mp3");
const requestSound = new Audio("assets/sounds/request.mp3");

function computeDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
}

// Initialize map with current location
navigator.geolocation.getCurrentPosition(pos => initMap(pos), () => alert("Allow location access"));

function initMap(pos) {
    passengerLatLng = [pos.coords.latitude, pos.coords.longitude];
    map = L.map("map", { zoomControl: false }).setView(passengerLatLng, 15);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19
    }).addTo(map);
    L.circle(passengerLatLng, { radius: 60, color: "blue", fillOpacity: 0.4 }).addTo(map);

    listenDrivers();
    listenRequests();
}

function getMarkerColor(type) {
    switch (type) {
        case "regular": return "yellow";
        case "luxury": return "gold";
        case "maxi6": return "orange";
        case "maxi12": return "red";
        default: return "blue";
    }
}

// Listen to all online drivers
function listenDrivers() {
    firebase.database().ref("drivers").on("value", snapshot => {
        const drivers = snapshot.val() || {};
        let onlineCount = 0;

        for (const id in drivers) {
            const d = drivers[id];
            if (!d || !d.online) {
                if (driverMarkers[id]) { map.removeLayer(driverMarkers[id]); delete driverMarkers[id]; }
                continue;
            }

            onlineCount++;
            const latlng = [d.lat, d.lng];
            const color = getMarkerColor(d.taxiType);
            const wheelchairText = d.wheelchair ? "Yes" : "No";
            const now = Date.now();
            const isRejected = rejectedDrivers[id] && now - rejectedDrivers[id] < 60000;

            const hailButton = activeRequest || isRejected ? `<button disabled>Hail</button>` :
                `<button onclick="hailTaxi('${id}')">Hail</button>`;
            const cancelBtn = activeRequest === id ? `<button onclick="cancelRequest('${id}')">Cancel</button>` : "";

            const popupContent = `
                <b style="color:${color}">🚕 ${d.taxiNumber}</b><br>
                Seats: ${d.seats}<br>
                Type: ${d.taxiType}<br>
                Wheelchair: ${wheelchairText}<br>
                ${hailButton} ${cancelBtn}
            `;

            if (driverMarkers[id]) {
                driverMarkers[id].setLatLng(latlng);
                driverMarkers[id].getPopup().setContent(popupContent);
            } else {
                driverMarkers[id] = L.marker(latlng, {
                    icon: L.divIcon({
                        className: "driverMarker",
                        html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid #fff;"></div>`
                    })
                }).addTo(map).bindPopup(popupContent);
            }
        }

        document.getElementById("onlineCount").innerText = "Online taxis: " + onlineCount;
    });
}

// Listen to requests from passenger
function listenRequests() {
    firebase.database().ref("requests").on("value", snapshot => {
        const requests = snapshot.val() || {};
        activeRequest = null;
        if (passengerPolyline) { map.removeLayer(passengerPolyline); passengerPolyline = null; }

        for (const reqId in requests) {
            const r = requests[reqId];
            if (r.passengerId !== passengerId) continue;

            if (r.status === "pending") {
                activeRequest = r.driverId;
                statusBar.innerText = "Status: Requesting...";
                requestSound.play();
            }

            if (r.status === "accepted") {
                activeRequest = r.driverId;
                statusBar.innerText = "Status: Accepted by " + r.driverId;
                acceptedSound.play();

                const driverMarker = driverMarkers[r.driverId];
                if (driverMarker) {
                    passengerPolyline = L.polyline([driverMarker.getLatLng(), passengerLatLng], { color: "blue" }).addTo(map);
                }

                const etaInterval = setInterval(() => {
                    if (!activeRequest || !passengerPolyline) { clearInterval(etaInterval); return; }
                    const driverLatLng = driverMarkers[r.driverId].getLatLng();
                    const dist = computeDistance(driverLatLng.lat, driverLatLng.lng, passengerLatLng[0], passengerLatLng[1]);
                    const etaMin = Math.round(dist / 666.66); // 40 km/h approx
                    statusBar.innerText = "Status: Accepted by " + r.driverId + " | ETA: " + etaMin + " min";
                }, 5000);
            }

            if (r.status === "rejected") {
                rejectedDrivers[r.driverId] = Date.now();
                if (activeRequest === r.driverId) activeRequest = null;
                statusBar.innerText = "Status: No request yet";
                alert("Driver " + r.driverId + " rejected your request. Wait 1 min");
            }

            if (r.status === "cancelled" || r.status === "completed") {
                if (activeRequest === r.driverId) activeRequest = null;
                statusBar.innerText = "Status: No request yet";
                if (passengerPolyline) { map.removeLayer(passengerPolyline); passengerPolyline = null; }
            }
        }
    });
}

// Hail a taxi
function hailTaxi(driverId) {
    if (activeRequest) { alert("You have an active request."); return; }
    const now = Date.now();
    if (rejectedDrivers[driverId] && now - rejectedDrivers[driverId] < 60000) { alert("Wait 1 minute for this driver."); return; }

    const requestRef = firebase.database().ref("requests").push();
    requestRef.set({
        passengerId,
        driverId,
        status: "pending",
        lat: passengerLatLng[0],
        lng: passengerLatLng[1],
        timestamp: Date.now()
    });

    activeRequest = driverId;
    statusBar.innerText = "Status: Requesting...";
    requestSound.play();
    alert("Request sent to driver " + driverId);
}

// Cancel active request
function cancelRequest(driverId) {
    firebase.database().ref("requests").orderByChild("passengerId").equalTo(passengerId).once("value").then(snap => {
        const requests = snap.val() || {};
        for (const rId in requests) {
            const r = requests[rId];
            if (r.driverId === driverId && (r.status === "pending" || r.status === "accepted")) {
                firebase.database().ref("requests/" + rId).update({ status: "cancelled" });
            }
        }
    });
}