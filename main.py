import sys
import time
import argparse
import threading
import tkinter as tk
from typing import Optional
import uvicorn

from app.config import config
from app.server.main import app as fastapi_app
from app.core.network import get_primary_ip
from app.core.notifier import Notifier
from gui.app_window import MainWindow
from gui.tray import SystemTrayApp

class ODropApplication:
    def __init__(self, headless: bool = False, no_tray: bool = False):
        self.headless = headless
        self.no_tray = no_tray
        self.server_thread: Optional[threading.Thread] = None
        self.uvicorn_server: Optional[uvicorn.Server] = None
        self.tray_app: Optional[SystemTrayApp] = None
        self.root: Optional[tk.Tk] = None
        self.main_window: Optional[MainWindow] = None
        self.is_exiting = False

    def start_server(self):
        """Starts the FastAPI/Uvicorn server on a daemon thread."""
        u_config = uvicorn.Config(
            fastapi_app,
            host=config.host,
            port=config.port,
            log_level="info",
            access_log=False
        )
        self.uvicorn_server = uvicorn.Server(u_config)
        self.server_thread = threading.Thread(target=self.uvicorn_server.run, daemon=True)
        self.server_thread.start()
        print(f"==================================================")
        print(f"  ODrop - iPhone Dosya Aktarımı Başlatıldı!")
        print(f"  Yerel Ağ Adresi : http://{get_primary_ip()}:{config.port}")
        print(f"  Kayıt Klasörü   : {config.save_dir}")
        print(f"==================================================")

    def start_tray(self):
        """Starts the Windows System Tray icon."""
        if self.no_tray:
            return

        def _run_tray():
            self.tray_app = SystemTrayApp(
                on_show_window=self.show_window_from_tray,
                on_exit=self.exit_app
            )
            self.tray_app.start()

        tray_thread = threading.Thread(target=_run_tray, daemon=True)
        tray_thread.start()

    def show_window_from_tray(self):
        if self.root:
            def _restore():
                self.root.deiconify()
                self.root.lift()
                self.root.focus_force()
            self.root.after(0, _restore)

    def on_window_close(self):
        """When user clicks X, minimize to system tray instead of killing the server."""
        if not self.no_tray:
            self.root.withdraw()
            Notifier.show_toast(
                title="ODrop Arka Planda Aktif",
                message="iPhone'dan dosya aktarımlarını almaya devam ediyor. Açmak için tepsiyi kullanın."
            )
        else:
            self.exit_app()

    def exit_app(self):
        """Cleanly shuts down all components."""
        if self.is_exiting:
            return
        self.is_exiting = True
        print("[ODrop] Kapatılıyor...")

        if self.tray_app:
            self.tray_app.stop()

        if self.uvicorn_server:
            self.uvicorn_server.should_exit = True

        if self.root:
            try:
                self.root.destroy()
            except Exception:
                pass

        sys.exit(0)

    def run(self):
        self.start_server()

        if not self.headless:
            self.start_tray()
            self.root = tk.Tk()
            self.main_window = MainWindow(self.root, on_close_callback=self.on_window_close)
            try:
                self.root.mainloop()
            except KeyboardInterrupt:
                self.exit_app()
        else:
            print("[ODrop] Başsız (headless) modda çalışıyor. Durdurmak için Ctrl+C'ye basın.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.exit_app()

def main():
    parser = argparse.ArgumentParser(description="ODrop - iPhone to Windows Seamless File Transfer")
    parser.add_argument("--port", type=int, default=config.port, help=f"Server port (default: {config.port})")
    parser.add_argument("--save-dir", type=str, default=None, help="Directory to save received files")
    parser.add_argument("--headless", action="store_true", help="Run without Desktop GUI window")
    parser.add_argument("--no-tray", action="store_true", help="Disable Windows System Tray icon")
    args = parser.parse_args()

    if args.port:
        config._settings["port"] = args.port
    if args.save_dir:
        config.save_dir = args.save_dir

    app = ODropApplication(headless=args.headless, no_tray=args.no_tray)
    app.run()

if __name__ == "__main__":
    main()
