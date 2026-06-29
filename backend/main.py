import time
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI()

# ── CORS ──────────────────────────────────────────────────────────────────
origins = [os.getenv("FRONTEND_URL", "http://localhost:5173")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Connection Manager ────────────────────────────────────────────────────
class ConnectionManager:
    MAX_CONNECTIONS = 100
    MESSAGE_COOLDOWN = 0.5      # seconds between messages
    MAX_MESSAGE_LENGTH = 500    # characters

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.last_message_time: dict = {}
        self.active_usernames: set = set()

    async def connect(self, websocket: WebSocket, username: str) -> bool:
        if len(self.active_connections) >= self.MAX_CONNECTIONS:
            await websocket.close(code=1008, reason="Server is full")
            return False
        if username in self.active_usernames:
            await websocket.close(code=1008, reason="Username already taken")
            return False
        await websocket.accept()
        self.active_connections.append(websocket)
        self.active_usernames.add(username)
        return True

    def disconnect(self, websocket: WebSocket, username: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.active_usernames.discard(username)
        self.last_message_time.pop(username, None)

    def can_send(self, username: str) -> bool:
        now = time.time()
        last = self.last_message_time.get(username, 0)
        if now - last < self.MESSAGE_COOLDOWN:
            return False
        self.last_message_time[username] = now
        return True

    def sanitise(self, text: str) -> str:
        # Strip leading/trailing whitespace
        text = text.strip()
        # Escape HTML special characters to prevent XSS
        text = (
            text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&#x27;")
        )
        return text

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

    def get_online_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()


# ── Routes ────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "status": "Chatwave backend is running",
        "online": manager.get_online_count(),
    }


@app.get("/online")
def get_online():
    return {"online": manager.get_online_count()}


@app.websocket("/ws/{username}")
async def websocket_endpoint(
    websocket: WebSocket,
    username: str,
):
    # Validate username
    username = username.strip()
    if not username or len(username) > 20:
        await websocket.close(code=1008, reason="Invalid username")
        return

    # Sanitise username
    username = manager.sanitise(username)

    # Attempt connection
    connected = await manager.connect(websocket, username)
    if not connected:
        return

    # Announce join
    await manager.broadcast(
        f"SYSTEM::{username} joined · {manager.get_online_count()} online"
    )

    try:
        while True:
            data = await websocket.receive_text()

            # Length check
            if len(data) > manager.MAX_MESSAGE_LENGTH:
                await websocket.send_text(
                    f"SYSTEM::Message too long (max {manager.MAX_MESSAGE_LENGTH} chars)"
                )
                continue

            # Rate limit check
            if not manager.can_send(username):
                await websocket.send_text(
                    "SYSTEM::You're sending too fast. Slow down."
                )
                continue

            # Sanitise and broadcast
            clean_message = manager.sanitise(data)
            if clean_message:
                await manager.broadcast(f"MSG::{username}::{clean_message}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, username)
        await manager.broadcast(
            f"SYSTEM::{username} left · {manager.get_online_count()} online"
        )