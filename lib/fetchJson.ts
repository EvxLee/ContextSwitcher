// lib/fetchJson.ts — tiny POST-JSON helper shared by the browser debate clients.
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error || `${url} failed (HTTP ${res.status}).`);
  }
  return res.json() as Promise<T>;
}
