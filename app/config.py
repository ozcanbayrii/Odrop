import os
import sys
import json
from pathlib import Path
from typing import Dict, Any

def get_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent

DEFAULT_PORT = 5252
DEFAULT_HOST = "0.0.0.0"
DEFAULT_SAVE_DIR = Path.home() / "Downloads" / "ODrop"
CONFIG_FILE = get_app_dir() / "odrop_settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "host": DEFAULT_HOST,
    "port": DEFAULT_PORT,
    "save_dir": str(DEFAULT_SAVE_DIR),
    "play_sound": True,
    "notifications_enabled": True,
    "auto_open_folder": False,
    "remote_tunnel_enabled": False,
    "device_name": os.environ.get("COMPUTERNAME", "Windows PC"),
}

class Config:
    def __init__(self):
        self._settings = DEFAULT_SETTINGS.copy()
        self.load()

    def load(self):
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._settings.update(data)
            except Exception as e:
                print(f"[Config] Error loading settings: {e}")

        # Ensure save directory exists
        self.save_dir_path.mkdir(parents=True, exist_ok=True)

    def save(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self._settings, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Config] Error saving settings: {e}")

    @property
    def host(self) -> str:
        return self._settings.get("host", DEFAULT_HOST)

    @property
    def port(self) -> int:
        return int(self._settings.get("port", DEFAULT_PORT))

    @property
    def save_dir(self) -> str:
        return self._settings.get("save_dir", str(DEFAULT_SAVE_DIR))

    @save_dir.setter
    def save_dir(self, value: str):
        self._settings["save_dir"] = value
        Path(value).mkdir(parents=True, exist_ok=True)
        self.save()

    @property
    def save_dir_path(self) -> Path:
        p = Path(self.save_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def play_sound(self) -> bool:
        return bool(self._settings.get("play_sound", True))

    @play_sound.setter
    def play_sound(self, value: bool):
        self._settings["play_sound"] = value
        self.save()

    @property
    def notifications_enabled(self) -> bool:
        return bool(self._settings.get("notifications_enabled", True))

    @notifications_enabled.setter
    def notifications_enabled(self, value: bool):
        self._settings["notifications_enabled"] = value
        self.save()

    @property
    def device_name(self) -> str:
        return self._settings.get("device_name", os.environ.get("COMPUTERNAME", "Windows PC"))

    @device_name.setter
    def device_name(self, value: str):
        self._settings["device_name"] = value
        self.save()

    @property
    def remote_tunnel_enabled(self) -> bool:
        return bool(self._settings.get("remote_tunnel_enabled", False))

    @remote_tunnel_enabled.setter
    def remote_tunnel_enabled(self, value: bool):
        self._settings["remote_tunnel_enabled"] = value
        self.save()

config = Config()
