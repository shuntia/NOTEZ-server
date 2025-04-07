
// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: process.env.PORT || 4000 });

let waitingClient = null;

console.log("Starting server");

wss.on("connection", (ws) => {
  if (waitingClient) {
    // Pair them
    const peerA = waitingClient;
    const peerB = ws;
    peerA.peer = peerB;
    peerB.peer = peerA;

    peerA.send(JSON.stringify({ type: "match", initiator: true }));
    peerB.send(JSON.stringify({ type: "match", initiator: false }));

    waitingClient = null;
  } else {
    waitingClient = ws;
  }

  ws.on("message", (msg) => {
    if (ws.peer && ws.peer.readyState === WebSocket.OPEN) {
      ws.peer.send(msg); // Forward signaling data
    }
  });

  ws.on("close", () => {
    if (waitingClient === ws) waitingClient = null;
    if (ws.peer) ws.peer.close();
  });
});
