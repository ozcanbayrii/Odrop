import webbrowser
from typing import Callable, Optional
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item
from app.config import config
from app.core.notifier import Notifier

def create_tray_icon_image() -> Image.Image:
    """Draws a clean 64x64 ODrop badge icon for the system tray."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer dark circle matching modern black
    draw.ellipse((2, 2, 62, 62), fill="#09090b")
    # Radar rings
    draw.ellipse((12, 12, 52, 52), outline="#3f3f46", width=2)
    draw.ellipse((22, 22, 42, 42), outline="#71717a", width=2)
    # Center green beacon (active status)
    draw.ellipse((28, 28, 36, 36), fill="#10b981")

    return img

class SystemTrayApp:
    def __init__(
        self,
        on_show_window: Optional[Callable[[], None]] = None,
        on_exit: Optional[Callable[[], None]] = None
    ):
        self.on_show_window = on_show_window
        self.on_exit = on_exit
        self.icon: Optional[pystray.Icon] = None

    def start(self):
        icon_img = create_tray_icon_image()
        menu = (
            item("ODrop'u Aç", self._action_show, default=True),
            item("İndirilenler Klasörünü Aç", self._action_open_folder),
            item("Web Panelini Aç", self._action_open_web),
            pystray.Menu.SEPARATOR,
            item("Çıkış", self._action_exit),
        )

        self.icon = pystray.Icon("ODrop", icon_img, "ODrop - iPhone Dosya Aktarımı", menu)
        # Run in thread or non-blocking
        self.icon.run()

    def stop(self):
        if self.icon:
            self.icon.stop()

    def _action_show(self, icon, item):
        if self.on_show_window:
            self.on_show_window()

    def _action_open_folder(self, icon, item):
        Notifier.open_folder()

    def _action_open_web(self, icon, item):
        webbrowser.open(f"http://localhost:{config.port}")

    def _action_exit(self, icon, item):
        if self.icon:
            self.icon.stop()
        if self.on_exit:
            self.on_exit()
