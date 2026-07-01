import axios from "axios";
import { useState, type FormEvent } from "react";
import type { SearchResponse, SearchResult } from "../types";
import { ImageCard } from "./ImageCard";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function SearchSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState("");

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get<SearchResponse>("/api/images/search", {
        params: { q: trimmed },
      });
      setLastQuery(data.query);
      setResults(data.results);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : err instanceof Error
            ? err.message
            : "Search failed";
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Search images</h2>
      <p className="panel-intro">
        Search by keywords. Results are retrieved from PGVector and reranked by
        an agent for better relevance and explanations.
      </p>

      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. red sports car, beach sunset, coffee shop sign"
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <div className="msg error">{error}</div>}

      {loading && <LoadingSkeleton count={3} />}

      {!loading && lastQuery && results.length === 0 && (
        <p className="empty-state">No images matched &quot;{lastQuery}&quot;.</p>
      )}

      {!loading && results.length > 0 && (
        <p className="search-summary">
          {results.length} result{results.length !== 1 ? "s" : ""} for &quot;
          {lastQuery}&quot;
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="results-grid">
          {results.map((image) => (
            <ImageCard key={image.id} image={image} showScores />
          ))}
        </div>
      )}

      {!loading && !lastQuery && !error && (
        <p className="empty-state">
          Enter keywords to search indexed images. Upload at least one image
          first.
        </p>
      )}
    </section>
  );
}
