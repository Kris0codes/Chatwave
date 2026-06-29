import { useState, useEffect, useRef } from "react";

function Chat() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const ws = useRef(null);
  const bottomRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  function joinChat() {
    if (!username.trim()) return;

    // Connect to FastAPI WebSocket
    ws.current = new WebSocket(`ws://localhost:8000/ws/${username}`);

    ws.current.onopen = () => {
      setConnected(true);
      setJoined(true);
    };

    ws.current.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.current.onclose = () => {
      setConnected(false);
    };

    ws.current.onerror = () => {
      console.error("WebSocket error");
      setConnected(false);
    };
  }

  function sendMessage() {
    if (!message.trim() || !connected) return;
    ws.current.send(message);
    setMessage("");
  }

  // Send message on Enter key
  function handleKeyDown(e) {
    if (e.key === "Enter") sendMessage();
  }

  // JOIN SCREEN
  if (!joined) {
    return (
      <div style={styles.container}>
        <div style={styles.joinBox}>
          <h1 style={styles.logo}>Chatwave 🌊</h1>
          <p style={styles.subtitle}>Enter a username to join</p>
          <input
            style={styles.input}
            type="text"
            placeholder="Your username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinChat()}
          />
          <button style={styles.joinBtn} onClick={joinChat}>
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // CHAT SCREEN
  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.logo}>Chatwave 🌊</span>
          <span style={connected ? styles.online : styles.offline}>
            {connected ? "● Connected" : "● Disconnected"}
          </span>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={styles.empty}>No messages yet. Say hello!</p>
          )}
          {messages.map((msg, index) => {
            const isOwn = msg.startsWith(`${username}:`);
            const isSystem =
              msg.includes("joined the chat") || msg.includes("left the chat");
            return (
              <div
                key={index}
                style={{
                  ...styles.messageBubble,
                  alignSelf: isSystem
                    ? "center"
                    : isOwn
                    ? "flex-end"
                    : "flex-start",
                  background: isSystem
                    ? "#f0f0f0"
                    : isOwn
                    ? "#6c63ff"
                    : "#ffffff",
                  color: isSystem ? "#888" : isOwn ? "#fff" : "#111",
                  fontSize: isSystem ? "12px" : "14px",
                  fontStyle: isSystem ? "italic" : "normal",
                }}
              >
                {msg}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button style={styles.sendBtn} onClick={sendMessage}>
            Send
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#0f0c29",
    fontFamily: "sans-serif",
  },
  joinBox: {
    background: "#1c1a3a",
    padding: "40px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    width: "320px",
  },
  chatBox: {
    background: "#1c1a3a",
    borderRadius: "16px",
    width: "420px",
    height: "580px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #2e2b5f",
  },
  logo: {
    color: "#e0d7ff",
    fontSize: "20px",
    fontWeight: "bold",
  },
  subtitle: {
    color: "#a89ec9",
    fontSize: "14px",
  },
  online: { color: "#4caf50", fontSize: "13px" },
  offline: { color: "#f44336", fontSize: "13px" },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  messageBubble: {
    padding: "8px 14px",
    borderRadius: "18px",
    maxWidth: "75%",
    wordBreak: "break-word",
    lineHeight: "1.4",
  },
  empty: {
    color: "#665f8a",
    textAlign: "center",
    marginTop: "40px",
    fontSize: "14px",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderTop: "1px solid #2e2b5f",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "20px",
    border: "1px solid #3d3870",
    background: "#13112e",
    color: "#e0d7ff",
    fontSize: "14px",
    outline: "none",
  },
  joinBtn: {
    padding: "10px 28px",
    borderRadius: "20px",
    border: "none",
    background: "#6c63ff",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
    width: "100%",
  },
  sendBtn: {
    padding: "10px 20px",
    borderRadius: "20px",
    border: "none",
    background: "#6c63ff",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
  },
};

export default Chat;