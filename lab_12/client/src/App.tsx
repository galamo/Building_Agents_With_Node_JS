import "./App.css";
import { SearchSection } from "./components/SearchSection";
import { UploadSection } from "./components/UploadSection";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Lab 12 — Image RAG Search</h1>
        <p className="subtitle">
          Upload images, index them with a vision agent, store embeddings in
          PGVector, and search with keyword queries reranked by an AI agent.
        </p>
      </header>

      <main className="layout">
        <UploadSection />
        <SearchSection />
      </main>
    </div>
  );
}
