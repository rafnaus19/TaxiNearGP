import { db } from "./firebase.js";
import {
  ref, set, update, remove, onValue, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

let driverId = "driver_" + Math.floor(Math.random() * 100000);
let online = false;
let map, marker;

navigator.geolocation.getCurrentPosition(pos => {
  map = L.map("map").setView([pos.coords.latitude, pos.coords.longitude], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  marker = L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map);
});

document.getElementById("toggleBtn").onclick = async () => {
  if (!online) {
    const taxiNo = taxiNumber.value;
    if (!taxiNo.startsWith("T")) return alert("Taxi number must start with T");

    online = true;
    toggleBtn.innerText = "GO OFFLINE";
    taxiInfo.innerText = taxiNo;

    navigator.geolocation.watchPosition(pos => {
      set(ref(db, "drivers/" + driverId), {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        taxiNumber: taxiNo,
        seats: seats.value,
        type: type.value,
        online: true,
        time: serverTimestamp()
      });
      marker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
    });

  } else {
    online = false;
    toggleBtn.innerText = "GO ONLINE";
    taxiInfo.innerText = "OFFLINE";
    remove(ref(db, "drivers/" + driverId));
  }
};

onValue(ref(db, "requests"), snap => {
  snap.forEach(req => {
    const r = req.val();
    if (!r.driver && online) {
      document.getElementById("requestSound").play();
      if (confirm("New ride request. Accept?")) {
        update(ref(db, "requests/" + req.key), {
          driver: driverId,
          taxiNumber: taxiInfo.innerText
        });
        document.getElementById("acceptedSound").play();
      }
    }
  });
});