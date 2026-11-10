import os
import sys
import threading
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional
from PIL import Image, ImageTk

from app.config import config
from app.core.network import get_primary_ip, generate_qr_code_image
from app.core.receiver import receiver
from app.core.notifier import Notifier
from app.core.tunnel import tunnel

# ==============================================================================
# Theme Palettes (Light & Dark)
# ==============================================================================
THEMES = {
    "light": {
        "name": "light",
        "bg_page": "#f8f9fa",
        "bg_card": "#ffffff",
        "bg_subtle": "#f1f5f9",
        "border": "#e2e8f0",
        
        "text_main": "#0f172a",
        "text_muted": "#64748b",
        "text_dim": "#94a3b8",
        
        "btn_primary_bg": "#0f172a",
        "btn_primary_fg": "#ffffff",
        "btn_primary_hover": "#1e293b",
        
        "btn_secondary_bg": "#f1f5f9",
        "btn_secondary_fg": "#0f172a",
        "btn_secondary_hover": "#e2e8f0",
        
        "pill_green_bg": "#dcfce7",
        "pill_green_fg": "#15803d",
        "pill_green_border": "#86efac",
        
        "pill_gray_bg": "#f1f5f9",
        "pill_gray_fg": "#475569",
        "pill_gray_border": "#cbd5e1",
        
        "tree_bg": "#ffffff",
        "tree_fg": "#0f172a",
        "tree_heading_bg": "#f8fafc",
        "tree_heading_fg": "#0f172a",
        "tree_selected_bg": "#e2e8f0",
        "tree_selected_fg": "#0f172a",
    },
    "dark": {
        "name": "dark",
        "bg_page": "#09090b",
        "bg_card": "#141417",
        "bg_subtle": "#1c1c21",
        "border": "#27272a",
        
        "text_main": "#fafafa",
        "text_muted": "#a1a1aa",
        "text_dim": "#71717a",
        
        "btn_primary_bg": "#ffffff",
        "btn_primary_fg": "#09090b",
        "btn_primary_hover": "#e4e4e7",
        
        "btn_secondary_bg": "#27272a",
        "btn_secondary_fg": "#fafafa",
        "btn_secondary_hover": "#3f3f46",
        
        "pill_green_bg": "#064e3b",
        "pill_green_fg": "#a7f3d0",
        "pill_green_border": "#047857",
        
        "pill_gray_bg": "#27272a",
        "pill_gray_fg": "#d4d4d8",
        "pill_gray_border": "#3f3f46",
        
        "tree_bg": "#141417",
        "tree_fg": "#fafafa",
        "tree_heading_bg": "#1c1c21",
        "tree_heading_fg": "#fafafa",
        "tree_selected_bg": "#27272a",
        "tree_selected_fg": "#fafafa",
    }
}

# ==============================================================================
# Multi-language Support (TR / EN)
# ==============================================================================
LANGUAGES = {
    "tr": {
        "title": "ODrop — Kayıpsız Dosya Aktarımı",
        "brand_desc": "•  iPhone & PC Kayıpsız Dosya Aktarımı",
        "status": "● Aktif & Dinleniyor",
        "theme_dark": "🌙 Koyu Tema",
        "theme_light": "☀️ Aydınlık Tema",
        "lang_btn": "🌐 EN",
        "left_title": "Cihaz Bağlantısı",
        "left_desc": "iPhone kameranızla veya tarayıcınızla okutun",
        "ip_prefix": "Yerel Ağ: ",
        "btn_folder": "📁 İndirilenler Klasörünü Aç",
        "btn_web": "🌐 Yerel Web Panelini Aç",
        "btn_remote_web": "🚀 Uzaktan Aktarım (odrop.ozcan.work)",
        "btn_tunnel_start": "⚡ Dış Ağ Tüneli Başlat",
        "btn_tunnel_stop": "⚡ Tüneli Kapat",
        "btn_tunnel_loading": "⏳ Başlatılıyor...",
        "right_title": "Aktarım Geçmişi",
        "right_desc": "Sıfır kalite kaybıyla doğrudan İndirilenler\\ODrop klasörüne kaydedilir",
        "file_count": "dosya",
        "col_name": "Dosya Adı",
        "col_size": "Boyut",
        "col_time": "Tarih / Saat",
        "col_speed": "Aktarım Hızı",
        "hint": "💡 Listeden herhangi bir dosyaya çift tıklayarak klasörde açabilirsiniz.",
        "unknown_file": "Bilinmeyen"
    },
    "en": {
        "title": "ODrop — Lossless File Transfer",
        "brand_desc": "•  Lossless Transfer for iPhone & PC",
        "status": "● Active & Listening",
        "theme_dark": "🌙 Dark Mode",
        "theme_light": "☀️ Light Mode",
        "lang_btn": "🌐 TR",
        "left_title": "Device Connection",
        "left_desc": "Scan with iPhone camera or browser",
        "ip_prefix": "Local Network: ",
        "btn_folder": "📁 Open Downloads Folder",
        "btn_web": "🌐 Open Local Web Panel",
        "btn_remote_web": "🚀 Remote Transfer (odrop.ozcan.work)",
        "btn_tunnel_start": "⚡ Start Public Tunnel",
        "btn_tunnel_stop": "⚡ Stop Tunnel",
        "btn_tunnel_loading": "⏳ Starting...",
        "right_title": "Transfer History",
        "right_desc": "Saved directly to Downloads\\ODrop with zero quality loss",
        "file_count": "files",
        "col_name": "File Name",
        "col_size": "Size",
        "col_time": "Date / Time",
        "col_speed": "Transfer Speed",
        "hint": "💡 Double-click any file in the list to open in folder.",
        "unknown_file": "Unknown"
    }
}

FONT_LOGO = ("Segoe UI", 16, "bold")
FONT_TITLE = ("Segoe UI", 12, "bold")
FONT_SANS_BOLD = ("Segoe UI", 9, "bold")
FONT_SANS = ("Segoe UI", 9)
FONT_SANS_SMALL = ("Segoe UI", 8)
FONT_MONO = ("Consolas", 8)
FONT_MONO_BOLD = ("Consolas", 8, "bold")

class MainWindow:
    def __init__(self, root: tk.Tk, on_close_callback=None):
        self.root = root
        self.on_close_callback = on_close_callback
        self.qr_photo: Optional[ImageTk.PhotoImage] = None
        self.current_theme = "light"
        self.current_lang = "tr"
        self.t = THEMES[self.current_theme]
        self.l = LANGUAGES[self.current_lang]

        self.setup_window()
        self.create_widgets()
        self.apply_theme()
        self.apply_language()
        self.setup_events()

        # Connect receiver listener
        receiver.add_listener(self._on_file_received_event)
        tunnel.on_url_ready(self._on_tunnel_url_ready)

    def setup_window(self):
        self.root.title(self.l["title"])
        self.root.geometry("920x600")
        self.root.minsize(840, 540)
        self.root.configure(bg=self.t["bg_page"])

    def create_widgets(self):
        # ----------------------------------------------------------------------
        # Top Header Bar
        # ----------------------------------------------------------------------
        self.header_frame = tk.Frame(self.root, bg=self.t["bg_card"], padx=20, pady=12, highlightthickness=1, highlightbackground=self.t["border"])
        self.header_frame.pack(fill=tk.X, side=tk.TOP)

        # Brand Container
        self.brand_container = tk.Frame(self.header_frame, bg=self.t["bg_card"])
        self.brand_container.pack(side=tk.LEFT)

        self.brand_icon = tk.Label(
            self.brand_container,
            text="📡",
            font=("Segoe UI Emoji", 14),
            bg=self.t["bg_card"],
            fg=self.t["text_main"]
        )
        self.brand_icon.pack(side=tk.LEFT, padx=(0, 6))

        self.brand_title = tk.Label(
            self.brand_container,
            text="ODrop",
            font=FONT_LOGO,
            fg=self.t["text_main"],
            bg=self.t["bg_card"]
        )
        self.brand_title.pack(side=tk.LEFT)

        self.brand_badge = tk.Label(
            self.brand_container,
            text="AIR",
            font=FONT_MONO_BOLD,
            fg=self.t["text_muted"],
            bg=self.t["bg_subtle"],
            padx=6,
            pady=1,
            highlightthickness=1,
            highlightbackground=self.t["border"]
        )
        self.brand_badge._keep_custom_bg = True
        self.brand_badge.pack(side=tk.LEFT, padx=(8, 10))

        self.brand_desc = tk.Label(
            self.brand_container,
            text=self.l["brand_desc"],
            font=FONT_SANS_SMALL,
            fg=self.t["text_muted"],
            bg=self.t["bg_card"]
        )
        self.brand_desc.pack(side=tk.LEFT)

        # Header Right Actions
        self.header_actions = tk.Frame(self.header_frame, bg=self.t["bg_card"])
        self.header_actions.pack(side=tk.RIGHT)

        # Status Pill
        self.status_pill = tk.Label(
            self.header_actions,
            text=self.l["status"],
            font=FONT_SANS_BOLD,
            fg=self.t["pill_green_fg"],
            bg=self.t["pill_green_bg"],
            padx=10,
            pady=4,
            highlightthickness=1,
            highlightbackground=self.t["pill_green_border"]
        )
        self.status_pill._keep_custom_bg = True
        self.status_pill.pack(side=tk.LEFT, padx=5)

        # Language Toggle Button (TR / EN)
        self.lang_btn = tk.Button(
            self.header_actions,
            text=self.l["lang_btn"],
            font=FONT_SANS_BOLD,
            cursor="hand2",
            relief="flat",
            bd=0,
            padx=8,
            pady=4,
            command=self.toggle_lang
        )
        self.lang_btn._keep_custom_bg = True
        self.lang_btn.pack(side=tk.LEFT, padx=5)

        # Theme Toggle Button
        self.theme_btn = tk.Button(
            self.header_actions,
            text=self.l["theme_dark"],
            font=FONT_SANS,
            cursor="hand2",
            relief="flat",
            bd=0,
            padx=10,
            pady=4,
            command=self.toggle_theme
        )
        self.theme_btn._keep_custom_bg = True
        self.theme_btn.pack(side=tk.LEFT, padx=5)

        # ----------------------------------------------------------------------
        # Main Two-Card Split Container
        # ----------------------------------------------------------------------
        self.content_container = tk.Frame(self.root, bg=self.t["bg_page"])
        self.content_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=16)

        # ----------------------------------------------------------------------
        # LEFT CARD: Cihaz Bağlantısı & QR Kod
        # ----------------------------------------------------------------------
        self.left_card = tk.Frame(
            self.content_container,
            bg=self.t["bg_card"],
            width=320,
            padx=18,
            pady=18,
            highlightthickness=1,
            highlightbackground=self.t["border"]
        )
        self.left_card.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 14))
        self.left_card.pack_propagate(False)

        # Card Title
        self.left_title = tk.Label(
            self.left_card,
            text=self.l["left_title"],
            font=FONT_TITLE,
            fg=self.t["text_main"],
            bg=self.t["bg_card"]
        )
        self.left_title.pack(anchor="w")

        self.left_desc = tk.Label(
            self.left_card,
            text=self.l["left_desc"],
            font=FONT_SANS_SMALL,
            fg=self.t["text_muted"],
            bg=self.t["bg_card"]
        )
        self.left_desc.pack(anchor="w", pady=(2, 10))

        # QR Code Container (Always crisp white background for scanning)
        self.qr_box = tk.Frame(
            self.left_card,
            bg="#ffffff",
            padx=8,
            pady=8,
            highlightthickness=1,
            highlightbackground=self.t["border"]
        )
        self.qr_box._keep_custom_bg = True
        self.qr_box.pack(pady=4)

        self.qr_label = tk.Label(self.qr_box, bg="#ffffff")
        self.qr_label._keep_custom_bg = True
        self.qr_label.pack()
        self.update_qr()

        # IP & Port Badge
        self.ip_pill = tk.Label(
            self.left_card,
            text=f"{self.l['ip_prefix']}{get_primary_ip()}:{config.port}",
            font=FONT_MONO,
            fg=self.t["text_muted"],
            bg=self.t["bg_subtle"],
            padx=8,
            pady=4,
            highlightthickness=1,
            highlightbackground=self.t["border"]
        )
        self.ip_pill._keep_custom_bg = True
        self.ip_pill.pack(fill=tk.X, pady=(10, 14))

        # Bottom Action Buttons in Left Card
        self.left_btn_frame = tk.Frame(self.left_card, bg=self.t["bg_card"])
        self.left_btn_frame.pack(fill=tk.X, side=tk.BOTTOM)

        # Primary Button: Klasörü Aç
        self.btn_open_folder = tk.Button(
            self.left_btn_frame,
            text=self.l["btn_folder"],
            font=FONT_SANS_BOLD,
            cursor="hand2",
            relief="flat",
            bd=0,
            pady=7,
            command=Notifier.open_folder
        )
        self.btn_open_folder._keep_custom_bg = True
        self.btn_open_folder.pack(fill=tk.X, pady=3)

        # Secondary Button: Web Panelini Aç
        self.btn_open_web = tk.Button(
            self.left_btn_frame,
            text=self.l["btn_web"],
            font=FONT_SANS,
            cursor="hand2",
            relief="flat",
            bd=0,
            pady=6,
            command=lambda: webbrowser.open(f"http://localhost:{config.port}")
        )
        self.btn_open_web._keep_custom_bg = True
        self.btn_open_web.pack(fill=tk.X, pady=3)

        # Remote Web Bridge Button
        self.btn_remote_web = tk.Button(
            self.left_btn_frame,
            text=self.l["btn_remote_web"],
            font=FONT_SANS,
            cursor="hand2",
            relief="flat",
            bd=0,
            pady=6,
            command=lambda: webbrowser.open("https://odrop.ozcan.work")
        )
        self.btn_remote_web._keep_custom_bg = True
        self.btn_remote_web.pack(fill=tk.X, pady=3)

        # Tünel Butonu
        self.tunnel_btn = tk.Button(
            self.left_btn_frame,
            text=self.l["btn_tunnel_start"],
            font=FONT_SANS,
            cursor="hand2",
            relief="flat",
            bd=0,
            pady=6,
            command=self.toggle_tunnel
        )
        self.tunnel_btn._keep_custom_bg = True
        self.tunnel_btn.pack(fill=tk.X, pady=3)

        # ----------------------------------------------------------------------
        # RIGHT CARD: Aktarım Geçmişi & Tablo
        # ----------------------------------------------------------------------
        self.right_card = tk.Frame(
            self.content_container,
            bg=self.t["bg_card"],
            padx=18,
            pady=18,
            highlightthickness=1,
            highlightbackground=self.t["border"]
        )
        self.right_card.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # Right Header
        self.right_header = tk.Frame(self.right_card, bg=self.t["bg_card"])
        self.right_header.pack(fill=tk.X, pady=(0, 10))

        self.right_header_left = tk.Frame(self.right_header, bg=self.t["bg_card"])
        self.right_header_left.pack(side=tk.LEFT)

        self.right_title = tk.Label(
            self.right_header_left,
            text=self.l["right_title"],
            font=FONT_TITLE,
            fg=self.t["text_main"],
            bg=self.t["bg_card"]
        )
        self.right_title.pack(anchor="w")

        self.right_desc = tk.Label(
            self.right_header_left,
            text=self.l["right_desc"],
            font=FONT_SANS_SMALL,
            fg=self.t["text_muted"],
            bg=self.t["bg_card"]
        )
        self.right_desc.pack(anchor="w", pady=(1, 0))

        self.count_badge = tk.Label(
            self.right_header,
            text=f"0 {self.l['file_count']}",
            font=FONT_SANS_BOLD,
            fg=self.t["pill_gray_fg"],
            bg=self.t["pill_gray_bg"],
            padx=10,
            pady=3,
            highlightthickness=1,
            highlightbackground=self.t["pill_gray_border"]
        )
        self.count_badge._keep_custom_bg = True
        self.count_badge.pack(side=tk.RIGHT)

        # Treeview Container
        self.tree_frame = tk.Frame(self.right_card, bg=self.t["bg_card"])
        self.tree_frame.pack(fill=tk.BOTH, expand=True, pady=(4, 10))

        columns = ("name", "size", "time", "speed")
        self.tree = ttk.Treeview(self.tree_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("name", text=self.l["col_name"])
        self.tree.heading("size", text=self.l["col_size"])
        self.tree.heading("time", text=self.l["col_time"])
        self.tree.heading("speed", text=self.l["col_speed"])

        self.tree.column("name", width=240, anchor="w")
        self.tree.column("size", width=80, anchor="center")
        self.tree.column("time", width=80, anchor="center")
        self.tree.column("speed", width=90, anchor="center")

        scrollbar = ttk.Scrollbar(self.tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Hint at bottom of right card
        self.hint_label = tk.Label(
            self.right_card,
            text=self.l["hint"],
            font=FONT_SANS_SMALL,
            fg=self.t["text_muted"],
            bg=self.t["bg_card"]
        )
        self.hint_label.pack(anchor="w")

        # Double click to open folder
        self.tree.bind("<Double-1>", lambda e: Notifier.open_folder())

        # Load existing files
        self.load_initial_files()

    def _sync_backgrounds(self, parent_widget, bg_color):
        """Recursively ensures all children without _keep_custom_bg inherit the container bg."""
        for child in parent_widget.winfo_children():
            if not getattr(child, "_keep_custom_bg", False):
                try:
                    child.configure(bg=bg_color)
                except Exception:
                    pass
                self._sync_backgrounds(child, bg_color)

    def apply_theme(self):
        t = THEMES[self.current_theme]
        self.t = t

        # Window root & Page frame
        self.root.configure(bg=t["bg_page"])
        self.content_container.configure(bg=t["bg_page"])

        # Header Frame & Children
        self.header_frame.configure(bg=t["bg_card"], highlightbackground=t["border"])
        self.brand_container.configure(bg=t["bg_card"])
        self.header_actions.configure(bg=t["bg_card"])
        self.brand_icon.configure(bg=t["bg_card"], fg=t["text_main"])
        self.brand_title.configure(fg=t["text_main"], bg=t["bg_card"])
        self.brand_badge.configure(fg=t["text_muted"], bg=t["bg_subtle"], highlightbackground=t["border"])
        self.brand_desc.configure(fg=t["text_muted"], bg=t["bg_card"])

        self.status_pill.configure(
            fg=t["pill_green_fg"],
            bg=t["pill_green_bg"],
            highlightbackground=t["pill_green_border"]
        )
        
        # Lang button style
        self.lang_btn.configure(
            bg=t["btn_secondary_bg"],
            fg=t["btn_secondary_fg"],
            activebackground=t["btn_secondary_hover"],
            activeforeground=t["btn_secondary_fg"]
        )

        # Theme button text and style
        theme_txt = self.l["theme_light"] if self.current_theme == "dark" else self.l["theme_dark"]
        self.theme_btn.configure(
            text=theme_txt,
            bg=t["btn_secondary_bg"],
            fg=t["btn_secondary_fg"],
            activebackground=t["btn_secondary_hover"],
            activeforeground=t["btn_secondary_fg"]
        )

        # Left Card
        self.left_card.configure(bg=t["bg_card"], highlightbackground=t["border"])
        self.left_title.configure(fg=t["text_main"], bg=t["bg_card"])
        self.left_desc.configure(fg=t["text_muted"], bg=t["bg_card"])
        self.qr_box.configure(bg="#ffffff", highlightbackground=t["border"])
        self.qr_label.configure(bg="#ffffff")
        self.ip_pill.configure(fg=t["text_muted"], bg=t["bg_subtle"], highlightbackground=t["border"])
        self.left_btn_frame.configure(bg=t["bg_card"])

        self.btn_open_folder.configure(
            bg=t["btn_primary_bg"],
            fg=t["btn_primary_fg"],
            activebackground=t["btn_primary_hover"],
            activeforeground=t["btn_primary_fg"]
        )
        self.btn_open_web.configure(
            bg=t["btn_secondary_bg"],
            fg=t["btn_secondary_fg"],
            activebackground=t["btn_secondary_hover"],
            activeforeground=t["btn_secondary_fg"]
        )
        self.btn_remote_web.configure(
            bg="#2563eb",
            fg="#ffffff",
            activebackground="#1d4ed8",
            activeforeground="#ffffff"
        )
        self.tunnel_btn.configure(
            bg=t["btn_secondary_bg"],
            fg=t["btn_secondary_fg"],
            activebackground=t["btn_secondary_hover"],
            activeforeground=t["btn_secondary_fg"]
        )

        # Right Card
        self.right_card.configure(bg=t["bg_card"], highlightbackground=t["border"])
        self.right_header.configure(bg=t["bg_card"])
        self.right_header_left.configure(bg=t["bg_card"])
        self.right_title.configure(fg=t["text_main"], bg=t["bg_card"])
        self.right_desc.configure(fg=t["text_muted"], bg=t["bg_card"])
        self.count_badge.configure(
            fg=t["pill_gray_fg"],
            bg=t["pill_gray_bg"],
            highlightbackground=t["pill_gray_border"]
        )
        self.tree_frame.configure(bg=t["bg_card"])
        self.hint_label.configure(fg=t["text_muted"], bg=t["bg_card"])

        # Enforce consistency across all child widgets
        self._sync_backgrounds(self.header_frame, t["bg_card"])
        self._sync_backgrounds(self.left_card, t["bg_card"])
        self._sync_backgrounds(self.right_card, t["bg_card"])

        # ttk Treeview Styling
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(
            "Treeview",
            background=t["tree_bg"],
            foreground=t["tree_fg"],
            fieldbackground=t["tree_bg"],
            rowheight=28,
            font=FONT_SANS,
            borderwidth=0
        )
        style.configure(
            "Treeview.Heading",
            background=t["tree_heading_bg"],
            foreground=t["tree_heading_fg"],
            font=FONT_SANS_BOLD,
            relief="flat",
            borderwidth=0
        )
        style.map(
            "Treeview",
            background=[("selected", t["tree_selected_bg"])],
            foreground=[("selected", t["tree_selected_fg"])]
        )
        style.map(
            "Treeview.Heading",
            background=[("active", t["tree_heading_bg"])],
            foreground=[("active", t["tree_heading_fg"])]
        )

    def apply_language(self):
        l = LANGUAGES[self.current_lang]
        self.l = l

        # Title & Subtitle
        self.root.title(l["title"])
        self.brand_desc.configure(text=l["brand_desc"])
        self.status_pill.configure(text=l["status"])

        # Buttons in header
        self.lang_btn.configure(text=l["lang_btn"])
        theme_txt = l["theme_light"] if self.current_theme == "dark" else l["theme_dark"]
        self.theme_btn.configure(text=theme_txt)

        # Left Card
        self.left_title.configure(text=l["left_title"])
        self.left_desc.configure(text=l["left_desc"])
        self.ip_pill.configure(text=f"{l['ip_prefix']}{get_primary_ip()}:{config.port}")
        self.btn_open_folder.configure(text=l["btn_folder"])
        self.btn_open_web.configure(text=l["btn_web"])
        self.btn_remote_web.configure(text=l["btn_remote_web"])
        
        tunnel_txt = l["btn_tunnel_stop"] if tunnel.is_running else l["btn_tunnel_start"]
        self.tunnel_btn.configure(text=tunnel_txt)

        # Right Card
        self.right_title.configure(text=l["right_title"])
        self.right_desc.configure(text=l["right_desc"])
        
        total = len(self.tree.get_children())
        self.count_badge.configure(text=f"{total} {l['file_count']}")

        # Treeview Headings
        self.tree.heading("name", text=l["col_name"])
        self.tree.heading("size", text=l["col_size"])
        self.tree.heading("time", text=l["col_time"])
        self.tree.heading("speed", text=l["col_speed"])

        # Hint
        self.hint_label.configure(text=l["hint"])

    def toggle_lang(self):
        self.current_lang = "en" if self.current_lang == "tr" else "tr"
        self.apply_language()

    def toggle_theme(self):
        self.current_theme = "dark" if self.current_theme == "light" else "light"
        self.apply_theme()

    def update_qr(self):
        target_url = tunnel.public_url or f"http://{get_primary_ip()}:{config.port}"
        pil_img = generate_qr_code_image(target_url)
        pil_img = pil_img.resize((150, 150), Image.Resampling.LANCZOS)
        self.qr_photo = ImageTk.PhotoImage(pil_img)
        self.qr_label.configure(image=self.qr_photo)

    def load_initial_files(self):
        files = receiver.get_existing_files()
        for f in reversed(files):
            self._insert_file_to_tree(f)
        self.count_badge.configure(text=f"{len(files)} {self.l['file_count']}")

    def _insert_file_to_tree(self, file_info: dict):
        self.tree.insert(
            "",
            0,
            values=(
                file_info.get("name", self.l["unknown_file"]),
                file_info.get("formatted_size", "-"),
                file_info.get("timestamp", "-"),
                file_info.get("speed", "-"),
            )
        )

    def _on_file_received_event(self, file_info: dict):
        def update():
            self._insert_file_to_tree(file_info)
            total = len(self.tree.get_children())
            self.count_badge.configure(text=f"{total} {self.l['file_count']}")
        self.root.after(0, update)

    def _on_tunnel_url_ready(self, url: str):
        def update():
            self.update_qr()
            self.tunnel_btn.configure(text=self.l["btn_tunnel_stop"])
        self.root.after(0, update)

    def toggle_tunnel(self):
        if tunnel.is_running:
            tunnel.stop_tunnel()
            self.tunnel_btn.configure(text=self.l["btn_tunnel_start"])
            self.update_qr()
        else:
            self.tunnel_btn.configure(text=self.l["btn_tunnel_loading"])
            tunnel.start_tunnel(config.port, on_ready=self._on_tunnel_url_ready)

    def setup_events(self):
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def on_close(self):
        if self.on_close_callback:
            self.on_close_callback()
        else:
            self.root.destroy()
