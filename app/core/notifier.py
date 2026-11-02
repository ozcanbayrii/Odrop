import os
import subprocess
from pathlib import Path
from typing import Optional
import winsound
from winotify import Notification
from app.config import config

class Notifier:
    @staticmethod
    def play_chime():
        if not config.play_sound:
            return
        try:
            # Play a gentle pleasant Windows notification sound
            winsound.MessageBeep(winsound.MB_ICONASTERISK)
        except Exception:
            pass

    @staticmethod
    def show_toast(
        title: str,
        message: str,
        file_path: Optional[str] = None,
        folder_path: Optional[str] = None
    ):
        if not config.notifications_enabled:
            return

        try:
            target_launch = folder_path or (str(Path(file_path).parent) if file_path else config.save_dir)
            toast = Notification(
                app_id="ODrop",
                title=title,
                msg=message,
            )
            toast.add_actions(label="📁 Klasörü Aç", launch=target_launch)
            toast.show()
        except Exception as e:
            print(f"[Notifier] Notification error: {e}")

    @staticmethod
    def open_folder(folder_path: Optional[str] = None):
        target = folder_path or config.save_dir
        try:
            p = Path(target).resolve()
            if not p.exists():
                p.mkdir(parents=True, exist_ok=True)
            # Open explorer at path
            os.startfile(str(p))
        except Exception as e:
            print(f"[Notifier] Could not open explorer: {e}")
            try:
                subprocess.Popen(["explorer.exe", str(target)])
            except Exception:
                pass
