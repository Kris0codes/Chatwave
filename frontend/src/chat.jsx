import { useState, useEffect, useRef } from "react";

// ── Message parser ────────────────────────────────────────────────────────
// Backend sends: "MSG::username::text" or "SYSTEM::text"
function parseMessage(raw) {
  if (raw.startsWith("SYSTEM::")) {
    return { type: "system", text: raw.replace("SYSTEM::", "") };
  }
  if (raw.startsWith("MSG::")) {
    const parts = raw.split("::");
    return { type: "message", username: parts[1], text: parts[2] };
  }
  return { type: "system", text: raw };
}

// ── Timestamp helper ──────────────────────────────────────────────────────
function getTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Chat() {
  const [username, setUsername]   = useState("");
  const [message, setMessage]     = useState("");
  const [messages, setMessages]   = useState([]);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined]       = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError]         = useState("");
  const [charCount, setCharCount] = useState(0);

  const ws        = useRef(null);
  const bottomRef = useRef(null);
  const MAX_CHARS = 500;

  // Auto scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => ws.current?.close();
  }, []);

  function joinChat() {
    const trimmed = username.trim();
    if (!trimmed) { setError("Enter a username"); return; }
    if (trimmed.length > 20) { setError("Max 20 characters"); return; }
    setError("");

    ws.current = new WebSocket(`ws://localhost:8000/ws/${trimmed}`);

    ws.current.onopen = () => {
      setConnected(true);
      setJoined(true);
    };

    ws.current.onmessage = (event) => {
      const parsed = parseMessage(event.data);

      // Extract online count from system messages
      const countMatch = parsed.text?.match(/(\d+) online/);
      if (countMatch) setOnlineCount(parseInt(countMatch[1]));

      setMessages((prev) => [
        ...prev,
        { ...parsed, time: getTime(), id: Date.now() + Math.random() },
      ]);
    };

    ws.current.onclose = (event) => {
      setConnected(false);
      if (event.reason) {
        setError(event.reason);
        setJoined(false);
      }
    };

    ws.current.onerror = () => {
      setConnected(false);
      setError("Could not connect to server. Is the backend running?");
    };
  }

  function sendMessage() {
    if (!message.trim() || !connected) return;
    if (message.length > MAX_CHARS) return;
    ws.current.send(message);
    setMessage("");
    setCharCount(0);
  }

  function handleMessageChange(e) {
    setMessage(e.target.value);
    setCharCount(e.target.value.length);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── JOIN SCREEN ─────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div style={s.page}>
        <div style={s.joinCard}>
          <div style={s.joinLogo}>
            <span style={s.logoText}>Chatwave</span>
            <span style={s.logoWave}>🌊</span>
          </div>
          <p style={s.joinSubtitle}>Real-time chat. No fluff.</p>

          <input
            style={{ ...s.input, ...(error ? s.inputError : {}) }}
            type="text"
            placeholder="Choose a username..."
            value={username}
            maxLength={20}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && joinChat()}
            autoFocus
          />
          {error && <p style={s.errorText}>{error}</p>}

          <button style={s.primaryBtn} onClick={joinChat}>
            Join Chat
          </button>

          <p style={s.hint}>Max 20 characters · No special accounts needed</p>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ─────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.chatCard}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.logoText}>Chatwave 🌊</span>
          </div>
          <div style={s.headerRight}>
            <span style={s.onlinePill}>
              <span style={s.onlineDot} />
              {onlineCount} online
            </span>
            <span style={connected ? s.statusOn : s.statusOff}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={s.messages}>
          {messages.length === 0 && (
            <p style={s.emptyState}>No messages yet. Say something 👋</p>
          )}

          {messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} style={s.systemMsg}>
                  {msg.text}
                </div>
              );
            }

            const isOwn = msg.username === username;
            return (
              <div
                key={msg.id}
                style={{
                  ...s.bubbleRow,
                  justifyContent: isOwn ? "flex-end" : "flex-start",
                }}
              >
                {!isOwn && (
                  <div style={s.avatar}>
                    {msg.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: "72%" }}>
                  {!isOwn && (
                    <p style={s.bubbleUsername}>{msg.username}</p>
                  )}
                  <div style={isOwn ? s.bubbleOwn : s.bubbleOther}>
                    {msg.text}
                  </div>
                  <p style={{
                    ...s.timestamp,
                    textAlign: isOwn ? "right" : "left"
                  }}>
                    {msg.time}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div style={s.inputArea}>
          <div style={s.inputWrapper}>
            <input
              style={s.chatInput}
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              disabled={!connected}
              maxLength={MAX_CHARS}
            />
            <span style={{
              ...s.charCounter,
              color: charCount > 450 ? "#f87171" : "#665f8a"
            }}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
          <button
            style={{
              ...s.sendBtn,
              opacity: !connected || !message.trim() ? 0.5 : 1,
            }}
            onClick={sendMessage}
            disabled={!connected || !message.trim()}
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#0f0c29",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px",
  },
  // Join card
  joinCard: {
    background: "#1c1a3a",
    border: "1px solid #2e2b5f",
    borderRadius: "20px",
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    width: "100%",
    maxWidth: "380px",
  },
  joinLogo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  logoText: {
    color: "#e0d7ff",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  logoWave: { fontSize: "28px" },
  joinSubtitle: {
    color: "#665f8a",
    fontSize: "14px",
    margin: "0 0 8px",
  },
  // Chat card
  chatCard: {
    background: "#1c1a3a",
    border: "1px solid #2e2b5f",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "480px",
    height: "620px",
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
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  onlinePill: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "#12103a",
    border: "1px solid #2e2b5f",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "12px",
    color: "#a89ec9",
  },
  onlineDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#4ade80",
    display: "inline-block",
  },
  statusOn:  { fontSize: "12px", color: "#4ade80" },
  statusOff: { fontSize: "12px", color: "#f87171" },
  // Messages
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  emptyState: {
    color: "#3d3870",
    textAlign: "center",
    marginTop: "60px",
    fontSize: "14px",
  },
  systemMsg: {
    alignSelf: "center",
    color: "#665f8a",
    fontSize: "12px",
    fontStyle: "italic",
    padding: "4px 12px",
    background: "#13112e",
    borderRadius: "20px",
    margin: "6px 0",
  },
  bubbleRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    margin: "4px 0",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#302b63",
    color: "#e0d7ff",
    fontSize: "12px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleUsername: {
    color: "#a89ec9",
    fontSize: "11px",
    margin: "0 0 3px 4px",
  },
  bubbleOwn: {
    background: "#6c63ff",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "18px 18px 4px 18px",
    fontSize: "14px",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  bubbleOther: {
    background: "#262450",
    color: "#e0d7ff",
    padding: "10px 14px",
    borderRadius: "18px 18px 18px 4px",
    fontSize: "14px",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },
  timestamp: {
    color: "#3d3870",
    fontSize: "11px",
    margin: "3px 4px 0",
  },
  // Input area
  inputArea: {
    display: "flex",
    gap: "8px",
    padding: "14px 20px",
    borderTop: "1px solid #2e2b5f",
    flexShrink: 0,
  },
  inputWrapper: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  chatInput: {
    width: "100%",
    padding: "10px 50px 10px 16px",
    borderRadius: "20px",
    border: "1px solid #3d3870",
    background: "#13112e",
    color: "#e0d7ff",
    fontSize: "14px",
    outline: "none",
  },
  charCounter: {
    position: "absolute",
    right: "12px",
    fontSize: "11px",
    pointerEvents: "none",
  },
  sendBtn: {
    padding: "10px 22px",
    borderRadius: "20px",
    border: "none",
    background: "#6c63ff",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
  // Shared
  input: {
    width: "100%",
    padding: "10px 16px",
    borderRadius: "20px",
    border: "1px solid #3d3870",
    background: "#13112e",
    color: "#e0d7ff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  inputError: {
    border: "1px solid #f87171",
  },
  errorText: {
    color: "#f87171",
    fontSize: "12px",
    margin: "-8px 0 0",
  },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "20px",
    border: "none",
    background: "#6c63ff",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  hint: {
    color: "#3d3870",
    fontSize: "12px",
    textAlign: "center",
    margin: "0",
  },
};