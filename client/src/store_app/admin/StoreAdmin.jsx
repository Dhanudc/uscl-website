import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import StoreAdminShell from "./StoreAdminShell";
import { formatInr, storeApi, storeMediaUrl } from "../storeApi";

function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    brandId: "",
    priceInr: "",
    description: "",
    sizes: "M:2,L:2,XL:1",
  });
  const [uploadId, setUploadId] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadFiles, setUploadFiles] = useState(null);
  const [replaceImages, setReplaceImages] = useState(false);
  const [msg, setMsg] = useState("");

  async function refreshProducts(q = search) {
    const qs = q.trim().length >= 2 ? `?q=${encodeURIComponent(q.trim())}` : "";
    const d = await storeApi(`/api/store/admin/products${qs}`);
    setProducts(d.products || []);
  }

  useEffect(() => {
    refreshProducts().catch(() => {});
    storeApi("/api/store/admin/categories").then((d) => setCategories(d.categories || []));
    storeApi("/api/store/admin/brands").then((d) => setBrands(d.brands || []));
  }, []);

  async function createProduct(e) {
    e.preventDefault();
    const sizes = form.sizes.split(",").map((chunk) => {
      const [sizeLabel, qty] = chunk.split(":");
      return { sizeLabel: sizeLabel?.trim(), stockQty: Number(qty) || 0 };
    });
    try {
      const d = await storeApi("/api/store/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          categoryId: form.categoryId,
          brandId: form.brandId,
          priceInr: Number(form.priceInr),
          description: form.description,
          status: "active",
          sizes,
        }),
      });
      setMsg(`Product created: ${d.product?.productCode || ""}`);
      setUploadId(d.product?.id || "");
      setUploadLabel(d.product?.name || d.product?.productCode || "");
      await refreshProducts();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function uploadImages(e) {
    e.preventDefault();
    if (!uploadId || !uploadFiles?.length) return;
    const fd = new FormData();
    for (const f of uploadFiles) fd.append("images", f);
    if (replaceImages) fd.append("replace", "true");
    try {
      const qs = replaceImages ? "?replace=true" : "";
      await storeApi(`/api/store/admin/products/${uploadId}/images${qs}`, { method: "POST", body: fd });
      setMsg(replaceImages ? "Images replaced." : "Images added.");
      setUploadFiles(null);
      setReplaceImages(false);
      await refreshProducts();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function setStatus(id, status) {
    await storeApi(`/api/store/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await refreshProducts();
  }

  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Products</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, name, brand…"
          className="min-w-[12rem] flex-1 rounded border border-[color:var(--border)] bg-ink-card px-3 py-2 text-sm"
        />
        <button type="button" className="btn-ghost" onClick={() => refreshProducts(search)}>
          Search
        </button>
      </div>
      <form onSubmit={createProduct} className="mt-6 grid gap-3 rounded-xl border border-[color:var(--border)] p-4 md:grid-cols-2">
        <input
          placeholder="Product name"
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Price (INR)"
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.priceInr}
          onChange={(e) => setForm({ ...form, priceInr: e.target.value })}
          required
        />
        <select
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          required
        >
          <option value="">Team category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.brandId}
          onChange={(e) => setForm({ ...form, brandId: e.target.value })}
          required
        >
          <option value="">Brand</option>
          {brands.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Sizes (M:2,L:2,XL:1)"
          className="md:col-span-2 rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.sizes}
          onChange={(e) => setForm({ ...form, sizes: e.target.value })}
        />
        <textarea
          placeholder="Description"
          className="md:col-span-2 rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit" className="btn-primary md:col-span-2">
          Add product
        </button>
      </form>
      {uploadId ? (
        <form onSubmit={uploadImages} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-accent/50 bg-ink-card/40 p-4">
          <label className="text-sm">
            Product images{uploadLabel ? ` — ${uploadLabel}` : ""}
            <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
              Select one or more files (up to 8 per upload). First image is the shop cover.
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-1 block text-xs"
              onChange={(e) => setUploadFiles(e.target.files)}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <input type="checkbox" checked={replaceImages} onChange={(e) => setReplaceImages(e.target.checked)} />
            Replace all existing images
          </label>
          <button type="submit" className="btn-primary" disabled={!uploadFiles?.length}>
            Save images
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setUploadId("")}>
            Cancel
          </button>
        </form>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-accent">{msg}</p> : null}
      <ul className="mt-8 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="flex flex-wrap gap-4 rounded-lg border border-[color:var(--border)] p-3 text-sm">
            {p.coverImage ? <img src={storeMediaUrl(p.coverImage)} alt="" className="h-16 w-16 object-contain bg-white" /> : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {p.productCode} · {p.name}
              </p>
              <p className="text-[color:var(--text-muted)]">
                {p.category?.name} · {p.brand?.name} · {formatInr(p.pricePaise)}
              </p>
              <p className="text-xs">
                {p.status} · {(p.images?.length || (p.coverImage ? 1 : 0))} photo
                {(p.images?.length || (p.coverImage ? 1 : 0)) === 1 ? "" : "s"} ·{" "}
                {(p.sizes || []).map((s) => `${s.sizeLabel}:${s.stockQty}`).join(", ")}
              </p>
            </div>
            <div className="flex gap-2">
              {p.status !== "active" ? (
                <button type="button" className="btn-ghost text-xs" onClick={() => setStatus(p.id, "active")}>
                  Activate
                </button>
              ) : (
                <button type="button" className="btn-ghost text-xs" onClick={() => setStatus(p.id, "draft")}>
                  Draft
                </button>
              )}
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  setUploadId(p.id);
                  setUploadLabel(`${p.productCode} · ${p.name}`);
                  setUploadFiles(null);
                  setReplaceImages(false);
                }}
              >
                Images
              </button>
            </div>
          </li>
        ))}
      </ul>
    </StoreAdminShell>
  );
}

function BrandsAdmin() {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => {
    storeApi("/api/store/admin/brands").then((d) => setBrands(d.brands || []));
  }, []);
  async function add(e) {
    e.preventDefault();
    await storeApi("/api/store/admin/brands", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    const d = await storeApi("/api/store/admin/brands");
    setBrands(d.brands || []);
  }
  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Brands</h1>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brand name"
          required
        />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>
      <ul className="mt-6 space-y-2">
        {brands.map((b) => (
          <li key={b._id}>
            {b.name} {b.active === false ? "(inactive)" : ""}
          </li>
        ))}
      </ul>
    </StoreAdminShell>
  );
}

function CategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    storeApi("/api/store/admin/categories").then((d) => setCategories(d.categories || []));
  }, []);
  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Categories (teams)</h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Linked to league franchises at bootstrap. Use General for non-team merchandise.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {categories.map((c) => (
          <li key={c._id} className="rounded border border-[color:var(--border)] px-3 py-2">
            {c.name} · {c.slug} {c.isGeneral ? "· General" : ""}
          </li>
        ))}
      </ul>
    </StoreAdminShell>
  );
}

function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    storeApi("/api/store/admin/orders").then((d) => setOrders(d.orders || []));
  }, []);
  async function updateStatus(id, orderStatus) {
    await storeApi(`/api/store/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus }),
    });
    const d = await storeApi("/api/store/admin/orders");
    setOrders(d.orders || []);
  }
  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Orders</h1>
      <ul className="mt-6 space-y-3 text-sm">
        {orders.map((o) => (
          <li key={o._id} className="rounded border border-[color:var(--border)] p-3">
            <p className="font-semibold">
              {o.orderNumber} · {formatInr(o.totalPaise)}
            </p>
            <p className="text-[color:var(--text-muted)]">
              {o.orderStatus} · {o.paymentStatus}
            </p>
            <select
              className="mt-2 rounded border border-[color:var(--border)] bg-ink-card px-2 py-1 text-xs"
              value={o.orderStatus}
              onChange={(e) => updateStatus(o._id, e.target.value)}
            >
              {[
                "pending_payment",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </StoreAdminShell>
  );
}

function CouponsAdmin() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", type: "fixed", valueInr: "100", minOrderInr: "0" });
  useEffect(() => {
    storeApi("/api/store/admin/coupons").then((d) => setCoupons(d.coupons || []));
  }, []);
  async function add(e) {
    e.preventDefault();
    await storeApi("/api/store/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: form.code,
        name: form.name || form.code,
        type: form.type,
        valueInr: Number(form.valueInr),
        minOrderInr: Number(form.minOrderInr),
      }),
    });
    const d = await storeApi("/api/store/admin/coupons");
    setCoupons(d.coupons || []);
  }
  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Coupons</h1>
      <form onSubmit={add} className="mt-4 grid max-w-lg gap-2 sm:grid-cols-2">
        <input
          placeholder="Code"
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
        <select
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="fixed">Fixed (INR)</option>
          <option value="percent">Percent</option>
        </select>
        <input
          placeholder="Value"
          className="rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
          value={form.valueInr}
          onChange={(e) => setForm({ ...form, valueInr: e.target.value })}
        />
        <button type="submit" className="btn-primary sm:col-span-2">
          Create coupon
        </button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {coupons.map((c) => (
          <li key={c._id}>
            {c.code} · {c.type} · {c.active ? "active" : "paused"}
          </li>
        ))}
      </ul>
    </StoreAdminShell>
  );
}

function CustomersAdmin() {
  const [customers, setCustomers] = useState([]);
  useEffect(() => {
    storeApi("/api/store/admin/customers").then((d) => setCustomers(d.customers || []));
  }, []);
  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Store customers</h1>
      <ul className="mt-6 space-y-2 text-sm">
        {customers.map((c) => (
          <li key={c._id} className="rounded border border-[color:var(--border)] px-3 py-2">
            {c.name} · {c.email} · {c.mobile}
          </li>
        ))}
      </ul>
    </StoreAdminShell>
  );
}

function SettingsAdmin() {
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    storeApi("/api/store/admin/settings").then((d) => setSettings(d.settings));
  }, []);
  async function save(e) {
    e.preventDefault();
    try {
      const d = await storeApi("/api/store/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(d.settings);
      setMsg("Saved.");
    } catch (err) {
      setMsg(err.message);
    }
  }
  if (!settings) return <StoreAdminShell>Loading…</StoreAdminShell>;
  return (
    <StoreAdminShell>
      <h1 className="font-display text-2xl">Store settings</h1>
      <form onSubmit={save} className="mt-6 max-w-xl space-y-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(settings.enabled)}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          Store enabled
        </label>
        <label className="block">
          Delivery fee (INR)
          <input
            type="number"
            className="mt-1 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
            value={(settings.deliveryFeePaise || 0) / 100}
            onChange={(e) =>
              setSettings({ ...settings, deliveryFeePaise: Math.round(Number(e.target.value) * 100) })
            }
          />
        </label>
        <label className="block">
          Free delivery above (INR)
          <input
            type="number"
            className="mt-1 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
            value={(settings.freeDeliveryThresholdPaise || 0) / 100}
            onChange={(e) =>
              setSettings({
                ...settings,
                freeDeliveryThresholdPaise: Math.round(Number(e.target.value) * 100),
              })
            }
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(settings.paymentModes?.cashfree)}
            onChange={(e) =>
              setSettings({
                ...settings,
                paymentModes: { ...settings.paymentModes, cashfree: e.target.checked },
              })
            }
          />
          Cashfree online
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(settings.paymentModes?.cod)}
            onChange={(e) =>
              setSettings({
                ...settings,
                paymentModes: { ...settings.paymentModes, cod: e.target.checked },
              })
            }
          />
          Cash on delivery
        </label>
        <label className="block">
          Bill type
          <select
            className="mt-1 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
            value={settings.billType || "gst"}
            onChange={(e) => setSettings({ ...settings, billType: e.target.value })}
          >
            <option value="gst">GST invoice</option>
            <option value="normal">Normal bill</option>
          </select>
        </label>
        <label className="block">
          GSTIN
          <input
            className="mt-1 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
            value={settings.gstin || ""}
            onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
          />
        </label>
        <button type="submit" className="btn-primary">
          Save settings
        </button>
        {msg ? <p className="text-accent">{msg}</p> : null}
      </form>
    </StoreAdminShell>
  );
}

export default function StoreAdmin() {
  return (
    <Routes>
      <Route path="products" element={<ProductsAdmin />} />
      <Route path="brands" element={<BrandsAdmin />} />
      <Route path="categories" element={<CategoriesAdmin />} />
      <Route path="orders" element={<OrdersAdmin />} />
      <Route path="coupons" element={<CouponsAdmin />} />
      <Route path="customers" element={<CustomersAdmin />} />
      <Route path="settings" element={<SettingsAdmin />} />
      <Route path="*" element={<Navigate to="products" replace />} />
    </Routes>
  );
}
