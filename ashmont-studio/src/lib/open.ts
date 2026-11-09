/** Open an external link with the OS handler in Tauri (scoped by capabilities), or the browser on the web. */
export async function openExternal(url: string): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else if (/^(tel|mailto):/.test(url)) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
