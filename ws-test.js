const { io } = require("socket.io-client");

const token = "PASTE_YOUR_JWT_ACCESS_TOKEN";
const deliveryId = 1;

const socket = io("http://localhost:3000/tracking", {
  transports: ["websocket"],
  auth: { token }, // Socket.IO handshake auth supported pattern 
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("subscribeDelivery", { deliveryId });
});

socket.on("subscribed", (data) => console.log("Subscribed:", data));

socket.on("tracking.event", (evt) => {
  console.log("TRACKING EVENT:", evt);
});

socket.on("delivery.updated", (d) => {
  console.log("DELIVERY UPDATED:", d);
});

socket.on("error", (e) => console.log("ERROR:", e));
socket.on("disconnect", () => console.log("Disconnected"));