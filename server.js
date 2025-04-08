// ...existing code replaced...
const WebSocket = require("ws");
const port = process.env.PORT || 4000;
const wss = new WebSocket.Server({ port });
let waitingClients = {};

console.log("Server running on port:", port);

wss.on("connection", (ws) => {
  console.log("New connection");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("Failed to parse message:", err);
      return;
    }

    // "probe" to create or join a match
    if (data.type === "probe") {
      const { code, pass } = data.data;
      if (waitingClients.hasOwnProperty(code)) {
        // Try matching
        if (pass === waitingClients[code].pass) {
          const peerA = waitingClients[code].ws;
          const peerB = ws;
          peerA.peer = peerB;
          peerB.peer = peerA;
          peerA.send(JSON.stringify({ type: "match", initiator: true }));
          peerB.send(JSON.stringify({ type: "match", initiator: false }));
          delete waitingClients[code];
          console.log("Matched code:", code);
        } else {
          ws.send(JSON.stringify({ type: "auth_failed" }));
        }
      } else {
        // Create a new waiting slot
        waitingClients[code] = { pass, ws };
        ws.send(JSON.stringify({ type: "newroom" }));
        console.log("Created new room for code:", code);
      }
    }

    // Forward any messages to paired peer
    if (ws.peer && ws.peer.readyState === WebSocket.OPEN) {
      ws.peer.send(msg);
    }
  });

  ws.on("close", () => {
    // Cleanup
    for (const code in waitingClients) {
      if (waitingClients[code].ws === ws) {
        delete waitingClients[code];
        break;
      }
    }
    if (ws.peer) {
      ws.peer.close();
    }
  });
});