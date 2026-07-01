import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

const TABS = [
  { id: "upload", label: "Upload" },
  { id: "search", label: "Search" },
];

function TagList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="tag-list">
      {items.map((tag) => (
        <span key={tag} className="tag">
          {tag}
        </span>
      ))}
    </div>
  );
}

function ImageCard({ image, showScore = false }) {
  return (
    <article className="image-card">
      <div className="image-wrap">
        <img src={image.url} alt={image.originalName || image.description || "Result"} />
      </div>
      <div className="image-meta">
        <h3>{image.originalName || "Untitled"}</h3>
        {showScore && image.score != null && (
          <span className="score">
            {image.matchType === "rag" ? "RAG" : "Text"} · score {(image.score * 100).toFixed(0)}%
          </span>
        )}
        {image.description && <p className="description">{image.description}</p>}
        {image.extractedText && (
          <p className="extracted-text">
            <strong>Text:</strong> {image.extractedText}
          </p>
        )}
        <TagList items={image.tags} />
        <TagList items={image.subjects?.map((s) => `subject: ${s}`)} />
      </div>
    </article>
  );
}

function UploadTab() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    setError(null);
    setResult(null);
    setFile(selected || null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data.image);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const message = err.response?.data?.error ?? err.message ?? "Upload failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <p className="panel-intro">
        Upload an image. The server extracts description, tags, subjects, and visible text using
        OpenRouter vision, then indexes it for search.
      </p>

      <form className="upload-form" onSubmit={handleUpload}>
        <label className="file-label">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
          />
          <span>{file ? file.name : "Choose an image…"}</span>
        </label>

        {preview && (
          <div className="preview">
            <img src={preview} alt="Preview" />
          </div>
        )}

        <button type="submit" disabled={!file || loading}>
          {loading ? "Indexing…" : "Upload & Index"}
        </button>
      </form>

      {error && <div className="msg error">{error}</div>}

      {result && (
        <div className="upload-result">
          <h2>Indexed successfully</h2>
          <ImageCard image={result} />
        </div>
      )}
    </section>
  );
}

function SearchTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [lastQuery, setLastQuery] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post("/api/search", { query: q });
      setLastQuery(data.query);
      setResults(data.results || []);
    } catch (err) {
      const message = err.response?.data?.error ?? err.message ?? "Search failed";
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <p className="panel-intro">
        Search by keywords, subjects, or phrases. Returns the top 5 best matches via RAG vector
        search (with text-match fallback).
      </p>

      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. beach sunset, coffee shop sign, red car…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <div className="msg error">{error}</div>}

      {lastQuery && !loading && (
        <div className="search-summary">
          {results.length === 0
            ? `No images matched "${lastQuery}".`
            : `${results.length} result${results.length !== 1 ? "s" : ""} for "${lastQuery}"`}
        </div>
      )}

      <div className="results-grid">
        {results.map((image) => (
          <ImageCard key={image.id} image={image} showScore />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState("upload");

  return (
    <div className="app">
      <header className="header">
        <h1>Lab 9 — Image Text Search</h1>
        <p className="subtitle">
          Upload images, extract text with AI, and search by keywords or subjects.
        </p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === "upload" ? <UploadTab /> : <SearchTab />}
      </main>
    </div>
  );
}
