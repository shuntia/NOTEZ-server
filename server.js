
// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: process.env.PORT || 4000 });

let waitingClient = null;
let waitingClients = {};

console.log("Starting server");

wss.on("connection", (ws) => {
  console.log("Connection initiated");
  if (waitingClient) {
    console.log("Pairing clients.");
    const peerA = waitingClient;
    const peerB = ws;
    peerA.peer = peerB;
    peerB.peer = peerA;
    waitingClient = null;
  } else {
    console.log("No waiting clients.");
    waitingClient = ws;
  }

  ws.on("message", (msg) => {
    try {
      let data = JSON.parse(msg);
      if (data.type == "probe") {
        let contents = data.data;
        if (contents.code in waitingClients) {
          if (contents.pass == waitingClients[contents.code].pass) {
            const peerA = waitingClients[contents.code].ws;
            const peerB = ws;
            peerA.peer = peerB;
            peerB.peer = peerA;
            peerA.send(JSON.stringify({ type: 'match', initiator: true }));
            peerB.send(JSON.stringify({ type: 'match', initiator: false }));
            delete waitingClients[code];
            console.log(waitingClients);
          }
        } else {
          waitingClients[contents.code] = { pass: contents.pass, ws: ws }
          ws.send(JSON.stringify({ type: 'newroom' }));
        }
      }


    } catch { }
    if (ws.peer && ws.peer.readyState === WebSocket.OPEN) {
      ws.peer.send(msg); // Forward signaling data
    }
  });

  ws.on("close", () => {
    if (waitingClient === ws) waitingClient = null;
    if (ws.peer) ws.peer.close();
  });
});
