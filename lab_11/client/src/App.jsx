import { useState } from "react";
import ProductsTable from "./components/ProductsTable.jsx";
import ChatBot from "./components/ChatBot.jsx";

export default function App() {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>🛍️ Lab 11 — Products Store</h1>
        <p className="app-subtitle">
          Full-stack REST API + AI Agent powered by MCP <code>getProducts</code> tool
        </p>
        <button
          className="toggle-chat-btn"
          onClick={() => setChatOpen((v) => !v)}
        >
          {chatOpen ? "Hide AI Assistant" : "Show AI Assistant"}
        </button>
      </header>

      <div className={`main-content ${chatOpen ? "with-chat" : ""}`}>
        <section className="products-section">
          <ProductsTable />
        </section>

        {chatOpen && (
          <aside className="chat-section">
            <ChatBot />
          </aside>
        )}
      </div>
    </div>
  );
}
