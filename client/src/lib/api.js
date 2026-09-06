// VITE_API_URL remains as a temporary fallback for existing local installations.
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";

export async function api(path, options = {}) {
  const token = sessionStorage.getItem("coparent_token");
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the API. Make sure the server is running on port 5000.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.details = data.details || data.fields;
    throw error;
  }
  return data;
}

export async function uploadAsset(file) {
  const body = new FormData();
  body.append("file", file);
  return api("/uploads", { method: "POST", body });
}

export async function uploadReceipt(file) {
  const body = new FormData();
  body.append("receipt", file);
  return api("/uploads/receipt", { method: "POST", body });
}

export async function downloadApi(path) {
  const token = sessionStorage.getItem("coparent_token");
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error("Cannot reach the API. Make sure the server is running on port 5000.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || "Export failed");
    error.status = response.status;
    throw error;
  }
  const disposition = response.headers.get("Content-Disposition") || "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "family-history";
  return { blob: await response.blob(), filename };
}
