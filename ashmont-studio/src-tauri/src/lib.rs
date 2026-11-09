//! Ashmont Studio native shell.
//!
//! Security posture: the webview gets **no custom IPC commands**. Everything the
//! UI needs (content, consultation submission) goes over HTTPS from the bundled
//! frontend, constrained by the CSP in `tauri.conf.json`. If a command is ever
//! added, validate every argument here on the Rust side and grant it through a
//! capability file scoped to the window that needs it.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init());

    // The updater refuses to start without a public key and endpoint, so it is
    // compiled in only for signed release builds: `--features updater`.
    // See docs/build-and-release.md.
    #[cfg(all(feature = "updater", desktop))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running Ashmont Studio");
}
