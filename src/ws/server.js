import { WebSocket, WebSocketServer } from "ws";
function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}


function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

// /ws will only handle websocket traffic on the same server as express, with express handling
// all other http traffic & /ws being reserved for websockets
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });

    wss.on('connection', (socket) => {
        sendJson(socket, { message: "Welcome to the WebSocket server!" });

        socket.on('error', console.error);
        
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'matchCreated', data: match });
    }

    return {
        broadcastMatchCreated,
    };
}
