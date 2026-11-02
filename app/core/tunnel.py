import os
import re
import sys
import time
import shutil
import threading
import subprocess
from pathlib import Path
from typing import Optional, Callable
import httpx

BIN_DIR = Path(__file__).resolve().parent.parent.parent / "bin"
CLOUDFLARED_EXE = BIN_DIR / "cloudflared.exe"
DOWNLOAD_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

class CloudflareTunnel:
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.public_url: Optional[str] = None
        self.is_running: bool = False
        self.is_downloading: bool = False
        self.status_message: str = "Kapalı"
        self._url_callbacks: list[Callable[[str], None]] = []

    def on_url_ready(self, callback: Callable[[str], None]):
        self._url_callbacks.append(callback)

    def is_binary_available(self) -> bool:
        if CLOUDFLARED_EXE.exists():
            return True
        if shutil.which("cloudflared"):
            return True
        return False

    def get_binary_path(self) -> str:
        if CLOUDFLARED_EXE.exists():
            return str(CLOUDFLARED_EXE)
        system_bin = shutil.which("cloudflared")
        if system_bin:
            return system_bin
        return str(CLOUDFLARED_EXE)

    def download_binary_sync(self, progress_callback: Optional[Callable[[float], None]] = None) -> bool:
        try:
            self.is_downloading = True
            self.status_message = "Cloudflare Tunnel indiriliyor..."
            BIN_DIR.mkdir(parents=True, exist_ok=True)
            temp_path = CLOUDFLARED_EXE.with_suffix(".tmp")

            with httpx.Client(follow_redirects=True, timeout=60.0) as client:
                with client.stream("GET", DOWNLOAD_URL) as response:
                    response.raise_for_status()
                    total = int(response.headers.get("content-length", 0))
                    downloaded = 0
                    with open(temp_path, "wb") as f:
                        for chunk in response.iter_bytes(chunk_size=65536):
                            if chunk:
                                f.write(chunk)
                                downloaded += len(chunk)
                                if total and progress_callback:
                                    progress_callback(downloaded / total)

            if temp_path.exists():
                if CLOUDFLARED_EXE.exists():
                    CLOUDFLARED_EXE.unlink()
                temp_path.rename(CLOUDFLARED_EXE)
            self.is_downloading = False
            self.status_message = "İndirme tamamlandı."
            return True
        except Exception as e:
            self.is_downloading = False
            self.status_message = f"İndirme hatası: {e}"
            print(f"[Tunnel] Download failed: {e}")
            return False

    def start_tunnel(self, local_port: int, on_ready: Optional[Callable[[str], None]] = None):
        """Starts the cloudflare quick tunnel in a background thread."""
        if self.is_running:
            return

        def _runner():
            if not self.is_binary_available():
                print("[Tunnel] cloudflared.exe bulunamadı, otomatik indiriliyor...")
                if not self.download_binary_sync():
                    self.status_message = "Cloudflare indirilemedi."
                    return

            exe_path = self.get_binary_path()
            self.status_message = "Tünel başlatılıyor..."
            try:
                # Start cloudflared quick tunnel
                cmd = [
                    exe_path,
                    "tunnel",
                    "--url", f"http://127.0.0.1:{local_port}",
                    "--no-autoupdate"
                ]
                # Windows flag to avoid popup window
                creation_flags = 0x08000000 if sys.platform == "win32" else 0

                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    creationflags=creation_flags
                )
                self.is_running = True

                # Read output to capture the trycloudflare.com URL
                url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
                while self.is_running and self.process and self.process.poll() is None:
                    line = self.process.stdout.readline()
                    if not line:
                        break
                    match = url_pattern.search(line)
                    if match:
                        self.public_url = match.group(0)
                        self.status_message = f"Aktif: {self.public_url}"
                        print(f"[Tunnel] Public HTTPS URL ready: {self.public_url}")
                        if on_ready:
                            on_ready(self.public_url)
                        for cb in self._url_callbacks:
                            try:
                                cb(self.public_url)
                            except Exception:
                                pass
                        break

            except Exception as e:
                self.status_message = f"Tünel hatası: {e}"
                print(f"[Tunnel] Error starting cloudflared: {e}")
                self.is_running = False

        threading.Thread(target=_runner, daemon=True).start()

    def stop_tunnel(self):
        self.is_running = False
        self.public_url = None
        self.status_message = "Kapalı"
        if self.process:
            try:
                self.process.terminate()
                self.process.kill()
            except Exception:
                pass
            self.process = None
        print("[Tunnel] Stopped.")

tunnel = CloudflareTunnel()
