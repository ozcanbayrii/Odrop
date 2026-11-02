import os
import re
import time
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from app.config import config
from app.core.notifier import Notifier

def sanitize_filename(filename: str) -> str:
    """Sanitizes filename for Windows OS while preserving extensions and unicode."""
    if not filename:
        return "file"
    # Remove directory separators
    filename = os.path.basename(filename)
    # Strip illegal Windows characters: < > : " / \ | ? *
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    filename = filename.strip()
    return filename or "odrop_file"

def get_unique_filepath(target_dir: Path, filename: str) -> Path:
    """Returns a unique file path, appending _1, _2 if file already exists."""
    dest = target_dir / filename
    if not dest.exists():
        return dest

    stem = dest.stem
    suffix = dest.suffix
    counter = 1
    while True:
        candidate = target_dir / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1

def format_size(size_bytes: int) -> str:
    """Formats bytes to human-readable string (KB, MB, GB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def get_file_category(extension: str) -> str:
    ext = extension.lower().lstrip(".")
    if ext in ["jpg", "jpeg", "png", "heic", "heif", "dng", "webp", "gif", "tiff", "bmp"]:
        return "photo"
    elif ext in ["mov", "mp4", "m4v", "mkv", "avi", "webm"]:
        return "video"
    elif ext in ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "pages", "numbers", "keynote"]:
        return "document"
    elif ext in ["m4a", "mp3", "wav", "aac", "flac"]:
        return "audio"
    elif ext in ["zip", "rar", "7z", "tar", "gz"]:
        return "archive"
    return "other"

class FileReceiver:
    def __init__(self):
        self.recent_files: List[Dict[str, Any]] = []
        self._listeners: List[Callable[[Dict[str, Any]], None]] = []

    def add_listener(self, callback: Callable[[Dict[str, Any]], None]):
        self._listeners.append(callback)

    def remove_listener(self, callback: Callable[[Dict[str, Any]], None]):
        if callback in self._listeners:
            self._listeners.remove(callback)

    def _notify_listeners(self, file_info: Dict[str, Any]):
        for listener in self._listeners:
            try:
                listener(file_info)
            except Exception as e:
                print(f"[FileReceiver] Listener error: {e}")

    async def save_upload_file(self, upload_file, custom_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Saves a Starlette/FastAPI UploadFile in chunks with 100% original fidelity.
        Preserves all bytes, EXIF data, and resolution.
        """
        raw_name = custom_name or upload_file.filename or "dosya"
        clean_name = sanitize_filename(raw_name)

        # Fallback extension if none
        if "." not in clean_name and upload_file.content_type:
            ct = upload_file.content_type.lower()
            if "heic" in ct:
                clean_name += ".heic"
            elif "jpeg" in ct or "jpg" in ct:
                clean_name += ".jpg"
            elif "png" in ct:
                clean_name += ".png"
            elif "quicktime" in ct or "mov" in ct:
                clean_name += ".mov"
            elif "mp4" in ct:
                clean_name += ".mp4"
            elif "pdf" in ct:
                clean_name += ".pdf"

        save_dir = config.save_dir_path
        target_path = get_unique_filepath(save_dir, clean_name)

        start_time = time.time()
        total_bytes = 0

        # Chunked stream write (1 MB chunks) for lossless, high-speed writing
        with open(target_path, "wb") as buffer:
            while True:
                chunk = await upload_file.read(1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)
                total_bytes += len(chunk)

        elapsed = max(time.time() - start_time, 0.001)
        speed_mb_s = (total_bytes / (1024 * 1024)) / elapsed

        ext = target_path.suffix.lower()
        category = get_file_category(ext)
        file_info = {
            "name": target_path.name,
            "original_name": raw_name,
            "path": str(target_path),
            "size": total_bytes,
            "formatted_size": format_size(total_bytes),
            "speed": f"{speed_mb_s:.1f} MB/s",
            "category": category,
            "extension": ext,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "date": datetime.now().strftime("%d.%m.%Y"),
        }

        # Store in recent list (max 100)
        self.recent_files.insert(0, file_info)
        if len(self.recent_files) > 100:
            self.recent_files.pop()

        # Play chime
        Notifier.play_chime()

        # Trigger Windows Toast Notification
        icon_emoji = {
            "photo": "📸 Fotoğraf",
            "video": "🎬 Video",
            "document": "📄 Belge",
            "audio": "🎵 Ses",
            "archive": "📦 Arşiv",
        }.get(category, "📁 Dosya")

        Notifier.show_toast(
            title=f"{icon_emoji} Alındı! ({file_info['formatted_size']})",
            message=f"{target_path.name} başarıyla bilgisayara aktarıldı.",
            file_path=str(target_path),
            folder_path=str(save_dir)
        )

        # Notify WebSockets / GUI
        self._notify_listeners(file_info)

        return file_info

    def get_existing_files(self) -> List[Dict[str, Any]]:
        """Scans the save directory and returns recent files sorted by modification time."""
        save_dir = config.save_dir_path
        files = []
        try:
            entries = sorted(
                save_dir.iterdir(),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            for p in entries[:50]:
                if p.is_file():
                    stat = p.stat()
                    ext = p.suffix.lower()
                    files.append({
                        "name": p.name,
                        "original_name": p.name,
                        "path": str(p),
                        "size": stat.st_size,
                        "formatted_size": format_size(stat.st_size),
                        "speed": "-",
                        "category": get_file_category(ext),
                        "extension": ext,
                        "timestamp": datetime.fromtimestamp(stat.st_mtime).strftime("%H:%M:%S"),
                        "date": datetime.fromtimestamp(stat.st_mtime).strftime("%d.%m.%Y"),
                    })
        except Exception as e:
            print(f"[FileReceiver] Scan error: {e}")
        return files

receiver = FileReceiver()
