import axios from "axios";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import type { UploadResponse } from "../types";
import { ImageCard } from "./ImageCard";

export function UploadSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse["image"] | null>(null);

  function resetPreview() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  function selectFile(selected: File | null) {
    setError(null);
    setResult(null);
    setFile(selected);
    resetPreview();
    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped?.type.startsWith("image/")) {
      selectFile(dropped);
    } else {
      setError("Please drop a valid image file.");
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await axios.post<UploadResponse>(
        "/api/images/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(data.image);
      setFile(null);
      resetPreview();
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : err instanceof Error
            ? err.message
            : "Upload failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Upload image</h2>
      <p className="panel-intro">
        Upload one image. The backend analyzes it with a vision model, builds a
        searchable text index, embeds it, and stores it in PGVector.
      </p>

      <form onSubmit={handleUpload}>
        <label
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={loading}
          />
          <span className="dropzone-label">
            Drag and drop an image here, or click to choose a file
          </span>
        </label>

        {preview && (
          <div className="preview">
            <img src={preview} alt="Selected preview" />
          </div>
        )}

        <div className="actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || loading}
          >
            {loading ? "Indexing…" : "Upload & index"}
          </button>
          {file && !loading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                selectFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Clear
            </button>
          )}
        </div>

        {loading && (
          <p className="progress">
            Analyzing image, generating embeddings, and saving to vector store…
          </p>
        )}
      </form>

      {error && <div className="msg error">{error}</div>}

      {result && (
        <div>
          <div className="msg success">Image indexed successfully.</div>
          <ImageCard image={result} />
        </div>
      )}
    </section>
  );
}
