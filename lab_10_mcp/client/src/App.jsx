import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const DEFAULT_TOPICS = [
  { id: "mcp", name: "Model Context Protocol", questionCount: 3 },
  { id: "langchain", name: "LangChain", questionCount: 3 },
  { id: "agents", name: "AI Agents", questionCount: 3 },
];

export default function App() {
  const [mode, setMode] = useState("mcp");
  const [topic, setTopic] = useState("mcp");
  const [topics, setTopics] = useState(DEFAULT_TOPICS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    axios
      .get("/api/topics")
      .then(({ data }) => {
        if (data.topics?.length) setTopics(data.topics);
      })
      .catch(() => {
        /* MCP server may be offline during dev */
      });
  }, []);

  function resetSession() {
    setMessages([]);
    setError(null);
    setInput("");
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    resetSession();
  }

  function handleTopicChange(nextTopic) {
    setTopic(nextTopic);
    resetSession();
  }

  async function sendMessage(text) {
    const userMessage = text.trim();
    if (!userMessage || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const { data } = await axios.post("/api/chat", {
        mode,
        topic,
        messages: history,
        userMessage,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, meta: { mode: data.mode } },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    await sendMessage("Start the quiz.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Lab 10 — MCP Quiz Agent</h1>
        <p className="subtitle">
          LangChain agent that only asks questions — you answer. Two modes: with MCP
          tools or standalone.
        </p>
      </header>

      <div className="controls">
        <div className="control-group">
          <span className="label">Mode</span>
          <div className="toggle">
            <button
              type="button"
              className={mode === "mcp" ? "active" : ""}
              onClick={() => handleModeChange("mcp")}
              disabled={loading}
            >
              MCP connected
            </button>
            <button
              type="button"
              className={mode === "standalone" ? "active" : ""}
              onClick={() => handleModeChange("standalone")}
              disabled={loading}
            >
              Standalone
            </button>
          </div>
        </div>

        <div className="control-group">
          <span className="label">Topic</span>
          <select
            value={topic}
            onChange={(e) => handleTopicChange(e.target.value)}
            disabled={loading}
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.questionCount} questions)
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={resetSession}
          disabled={loading}
        >
          Reset
        </button>
      </div>

      <main className="main">
        <div className="chat">
          {messages.length === 0 && (
            <div className="welcome">
              <p>
                {mode === "mcp"
                  ? "MCP mode: questions come from the Quiz MCP server via get_question / check_answer tools."
                  : "Standalone mode: the LLM generates quiz questions without MCP."}
              </p>
              <p>Click Start quiz or type your answer below.</p>
              {messages.length === 0 && (
                <button
                  type="button"
                  className="start-btn"
                  onClick={handleStart}
                  disabled={loading}
                >
                  Start quiz
                </button>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`turn ${m.role === "assistant" ? "assistant" : "user"}`}
            >
              <div className="role-label">
                {m.role === "assistant" ? "Quiz master" : "You"}
              </div>
              <div className={`msg ${m.role === "assistant" ? "answer" : "user-q"}`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && <div className="msg loading">Thinking…</div>}
          {error && <div className="msg error">Error: {error}</div>}
          <div ref={bottomRef} />
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
