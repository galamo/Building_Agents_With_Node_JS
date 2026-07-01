import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const TYPES = [
  "Camera", "E-Reader", "Earbuds", "Gaming Console",
  "Headphones", "Laptop", "Smartphone", "Smartwatch",
  "Tablet", "Television",
];

const emptyFilters = { name: "", type: "", minPrice: "", maxPrice: "" };

export default function ProductsTable() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (f.name) params.name = f.name;
      if (f.type) params.type = f.type;
      if (f.minPrice) params.minPrice = f.minPrice;
      if (f.maxPrice) params.maxPrice = f.maxPrice;

      const { data } = await axios.get("/api/products", { params });
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(applied);
  }, [applied, fetchProducts]);

  function handleSearch(e) {
    e.preventDefault();
    setApplied(filters);
  }

  function handleClear() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="products-table-card">
      <div className="table-header">
        <h2>Product Catalog</h2>
        <form className="filters" onSubmit={handleSearch}>
          <div className="filter-group">
            <label>Search name</label>
            <input
              type="text"
              placeholder="e.g. MacBook"
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Min price ($)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={filters.minPrice}
              onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
              style={{ width: 90 }}
            />
          </div>

          <div className="filter-group">
            <label>Max price ($)</label>
            <input
              type="number"
              placeholder="9999"
              min="0"
              value={filters.maxPrice}
              onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              style={{ width: 90 }}
            />
          </div>

          <button type="submit" className="filter-btn">Search</button>
          {hasFilters && (
            <button type="button" className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="result-count">
        {loading ? "Loading…" : error ? `Error: ${error}` : `${total} product${total !== 1 ? "s" : ""} found`}
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className="loading-row">
              <td colSpan={3}>Loading products…</td>
            </tr>
          ) : error ? (
            <tr className="empty-row">
              <td colSpan={3}>⚠️ {error}</td>
            </tr>
          ) : products.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={3}>No products match your filters.</td>
            </tr>
          ) : (
            products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="product-cell">
                    <img
                      className="product-img"
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                    />
                    <div>
                      <div className="product-name">{p.name}</div>
                      <div className="product-desc">{p.description}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="type-badge">{p.type}</span>
                </td>
                <td>
                  <span className="price">${p.price.toFixed(2)}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
