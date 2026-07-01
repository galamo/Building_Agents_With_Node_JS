import { useState, useRef, useEffect } from "react";
import axios from "axios";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm your AI product assistant. Ask me anything about our catalog — I can search by name, category, or price range using our MCP-connected getProducts tool. Try: \"Show me laptops under $2000\" or \"What gaming consoles do you have?\"",
};

const SUGGESTIONS = [
  "Show me all laptops",
  "What's under $300?",
  "Do you have cameras?",
  "Compare gaming consoles",
];

function ProductCards({ products, total }) {
  return (
    <div className="chat-products">
      <p className="chat-products-count">{total} product{total !== 1 ? "s" : ""} found</p>
      <div className="chat-products-grid">
        {products.map((p) => (
          <div key={p.id} className="chat-product-card">
            <img src={p.image} alt={p.name} className="chat-product-img" loading="lazy" />
            <div className="chat-product-info">
              <span className="chat-product-name">{p.name}</span>
              <span className="type-badge">{p.type}</span>
              <span className="price">${p.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatBot() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setThinking(true);

    try {
      const { data } = await axios.post("/api/agent/chat", {
        userMessage: trimmed,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        products: data.products,
        total: data.total,
      };
      setMessages([...history, assistantMsg]);
    } catch (err) {
      const errText = err.response?.data?.error || err.message;
      setMessages([
        ...history,
        { role: "assistant", content: `⚠️ Error: ${errText}` },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleClear() {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="chatbot">
      <div className="chat-header">
        <div style={{ flex: 1 }}>
          <h3>🤖 AI Product Assistant</h3>
          <p>Powered by LangChain + MCP <code>getProducts</code></p>
        </div>
        {messages.length > 1 && (
          <button className="chat-clear-btn" onClick={handleClear} disabled={thinking}>
            Clear
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-bubble">{msg.content}</div>
            {msg.products && msg.products.length > 0 && (
              <ProductCards products={msg.products} total={msg.total} />
            )}
          </div>
        ))}

        {thinking && (
          <div className="message assistant thinking">
            <div className="message-bubble">Calling getProducts via MCP…</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div style={{ padding: "0 16px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={thinking}
              style={{
                background: "#f0f4ff",
                border: "1px solid #c7d2fe",
                color: "#4338ca",
                padding: "5px 11px",
                borderRadius: 99,
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={1}
          placeholder="Ask about products…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!input.trim() || thinking}
        >
          Send
        </button>
      </form>

      <p className="chat-hint">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
