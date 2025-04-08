
// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: process.env.PORT || 4000 });

let waitingClients = {}; // Object to hold waiting clients keyed by match code

console.log("Starting server");

wss.on("connection", (ws) => {
  console.log("Connection initiated");

  ws.on("message", (msg) => {
    try {
      let data = JSON.parse(msg);

      // Handle probe messages for creating or joining a match
      if (data.type === "probe") {
        let contents = data.data;
        // Check if the match code exists in waitingClients
        if (waitingClients.hasOwnProperty(contents.code)) {
          // If the password matches the one stored from the first client...
          if (contents.pass === waitingClients[contents.code].pass) {
            // Pair the first client (peerA) with the current client (peerB)
            const peerA = waitingClients[contents.code].ws;
            const peerB = ws;
            peerA.peer = peerB;
            peerB.peer = peerA;
            // Inform the clients who is initiator and who is not
            peerA.send(JSON.stringify({ type: 'match', initiator: true }));
            peerB.send(JSON.stringify({ type: 'match', initiator: false }));
            // Remove the entry as the match is now complete
            delete waitingClients[contents.code];
            console.log("Match created for code", contents.code);
          } else {
            // Password did not match, send an authentication failure if desired.
            ws.send(JSON.stringify({ type: 'auth_failed', message: 'Password incorrect.' }));
          }
        } else {
          // No match exists, so create a new "room" with the given code and pass.
          waitingClients[contents.code] = { pass: contents.pass, ws: ws };
          ws.send(JSON.stringify({ type: 'newroom', message: 'New room created.' }));
          console.log("Created new room for code", contents.code);
        }
      }
    } catch (e) {
      console.error("Error handling message:", e);
    }

    // If this ws is paired with a peer and the peer is open, forward the message.
    if (ws.peer && ws.peer.readyState === WebSocket.OPEN) {
      ws.peer.send(msg);
    }
  });

  ws.on("close", () => {
    // Cleanup on close: remove the waiting client if it's still stored,
    // and close the peer's connection if it exists.
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
