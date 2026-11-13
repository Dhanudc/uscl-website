import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import StoreApiErrorPanel from "../components/StoreApiErrorPanel";
import { formatInr, storeApi, storeMediaUrl } from "../storeApi";
import { storePath } from "../urls";

export default function StoreHome() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState(params.get("q") || "");
  const [suggestions, setSuggestions] = useState([]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams(params);
    return p.toString();
  }, [params]);

  useEffect(() => {
    storeApi("/api/store/brands").then((d) => setBrands(d.brands || []));
    storeApi("/api/store/categories").then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    storeApi(`/api/store/products?${queryString}`)
      .then((d) => setProducts(d.products || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [queryString]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const id = setTimeout(() => {
      storeApi(`/api/store/search/suggest?q=${encodeURIComponent(q.trim())}`)
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  function toggleFilter(key, slug) {
    const p = new URLSearchParams(params);
    const current = new Set(String(p.get(key) || "").split(",").filter(Boolean));
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    if (current.size) p.set(key, [...current].join(","));
    else p.delete(key);
    setParams(p);
  }

  function applySearch(e) {
    e.preventDefault();
    const p = new URLSearchParams(params);
    if (q.trim()) p.set("q", q.trim());
    else p.delete("q");
    setParams(p);
    setSuggestions([]);
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
      <StoreHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <form onSubmit={applySearch} className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, brands, codes…"
              className="w-full rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-2 text-sm"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[color:var(--border)] bg-ink-card text-left text-sm shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={`${s.type}-${s.slug || s.productCode}-${i}`}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-ink-soft"
                      onClick={() => {
                        if (s.type === "product") navigate(storePath(`/product/${s.slug}`));
                        else {
                          const p = new URLSearchParams(params);
                          p.set(s.type === "brand" ? "brand" : "team", s.slug);
                          setParams(p);
                          setQ("");
                          setSuggestions([]);
                        }
                      }}
                    >
                      <span className="text-[10px] uppercase text-accent">{s.type}</span> {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Team</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleFilter("team", c.slug)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      String(params.get("team") || "").includes(c.slug)
                        ? "border-accent text-accent"
                        : "border-[color:var(--border)]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Brand</p>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleFilter("brand", b.slug)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      String(params.get("brand") || "").includes(b.slug)
                        ? "border-accent text-accent"
                        : "border-[color:var(--border)]"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={() => {
                setParams(new URLSearchParams());
                setQ("");
              }}
            >
              Clear filters
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          {error && !loading ? (
            <StoreApiErrorPanel message={error} />
          ) : loading ? (
            <p className="text-[color:var(--text-muted)]">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-[color:var(--text-muted)]">No products match your filters.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to={storePath(`/product/${p.slug}`)}
                  className="rounded-xl border border-[color:var(--border)] bg-ink-card p-3 transition hover:border-accent"
                >
                  {p.coverImage ? (
                    <img src={storeMediaUrl(p.coverImage)} alt="" className="mb-3 aspect-square w-full rounded-lg object-contain bg-white" />
                  ) : (
                    <div className="mb-3 aspect-square rounded-lg bg-ink-soft" />
                  )}
                  <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-muted)]">{p.productCode}</p>
                  <p className="font-display text-lg text-[color:var(--title)]">{p.name}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {p.category?.name} · {p.brand?.name}
                  </p>
                  <p className="mt-2 font-semibold text-accent">{formatInr(p.pricePaise)}</p>
                  {!p.inStock ? (
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">Out of stock</p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
