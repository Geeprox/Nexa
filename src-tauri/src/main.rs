#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Menu, Submenu, WindowEvent};

fn main() {
  let hide_item = CustomMenuItem::new("hide_app", "隐藏 Nexa");
  let app_menu = Menu::new().add_item(hide_item);
  let menu = Menu::new()
    .add_submenu(Submenu::new("Nexa", app_menu));

  tauri::Builder::default()
    .menu(menu)
    .on_menu_event(|event| {
      if event.menu_item_id() == "hide_app" {
        let _ = event.window().hide();
      }
    })
    .on_window_event(|event| {
      if let WindowEvent::CloseRequested { api, .. } = event.event() {
        api.prevent_close();
        let _ = event.window().hide();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
