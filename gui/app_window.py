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

class MainWindow:
    def __init__(self, root: tk.Tk, on_close_callback=None):
        self.root = root
        self.on_close_callback = on_close_callback
        self.qr_photo: Optional[ImageTk.PhotoImage] = None

        self.setup_window()
        self.create_widgets()
        self.setup_events()

        # Connect receiver listener
        receiver.add_listener(self._on_file_received_event)
        tunnel.on_url_ready(self._on_tunnel_url_ready)

    def setup_window(self):
        self.root.title("ODrop - iPhone Dosya Aktarımı")
        self.root.geometry("860x560")
        self.root.minsize(780, 500)
        self.root.configure(bg="#0b0f19")

        # Styling
        style = ttk.Style()
        style.theme_use("clam")

        # Treeview styling
        style.configure(
            "Treeview",
            background="#131b2e",
            foreground="#f8fafc",
            fieldbackground="#131b2e",
            rowheight=28,
            font=("Segoe UI", 9)
        )
        style.configure("Treeview.Heading", background="#1e293b", foreground="#38bdf8", font=("Segoe UI", 9, "bold"))
        style.map("Treeview", background=[("selected", "#0284c7")], foreground=[("selected", "#ffffff")])

        # Scrollbar styling
        style.configure("Vertical.TScrollbar", background="#1e293b", troughcolor="#0b0f19")

    def create_widgets(self):
        # Main split container
        main_frame = tk.Frame(self.root, bg="#0b0f19")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Left Panel (Status, QR Code, Actions)
        left_panel = tk.Frame(main_frame, bg="#161f33", width=320, padx=18, pady=18, highlightbackground="#222f49", highlightthickness=1)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 16))
        left_panel.pack_propagate(False)

        # Brand Title
        brand_frame = tk.Frame(left_panel, bg="#161f33")
        brand_frame.pack(fill=tk.X, pady=(0, 12))

        tk.Label(
            brand_frame,
            text="📡 ODrop",
            font=("Segoe UI", 16, "bold"),
            fg="#38bdf8",
            bg="#161f33"
        ).pack(anchor="w")

        tk.Label(
            brand_frame,
            text="iPhone'dan PC'ye Kayıpsız Aktarım",
            font=("Segoe UI", 8),
            fg="#94a3b8",
            bg="#161f33"
        ).pack(anchor="w")

        # Status Badge
        status_frame = tk.Frame(left_panel, bg="#0d281e", padx=10, pady=6, highlightbackground="#10b981", highlightthickness=1)
        status_frame.pack(fill=tk.X, pady=(0, 14))

        tk.Label(
            status_frame,
            text="🟢 Sunucu Aktif & Dinleniyor",
            font=("Segoe UI", 9, "bold"),
            fg="#34d399",
            bg="#0d281e"
        ).pack(anchor="w")

        self.ip_label = tk.Label(
            status_frame,
            text=f"IP: {get_primary_ip()}:{config.port}",
            font=("Consolas", 8),
            fg="#a7f3d0",
            bg="#0d281e"
        )
        self.ip_label.pack(anchor="w", pady=(2, 0))

        # QR Code Container
        qr_frame = tk.Frame(left_panel, bg="#ffffff", padx=8, pady=8)
        qr_frame.pack(pady=4)

        self.qr_label = tk.Label(qr_frame, bg="#ffffff")
        self.qr_label.pack()
        self.update_qr()

        tk.Label(
            left_panel,
            text="iPhone kameranızla QR kodu okutun",
            font=("Segoe UI", 8),
            fg="#94a3b8",
            bg="#161f33"
        ).pack(pady=(4, 14))

        # Left Action Buttons
        btn_frame = tk.Frame(left_panel, bg="#161f33")
        btn_frame.pack(fill=tk.X, side=tk.BOTTOM)

        btn_style = {"font": ("Segoe UI", 9, "bold"), "cursor": "hand2", "relief": "flat", "pady": 6}

        tk.Button(
            btn_frame,
            text="📁 Klasörü Aç",
            bg="#0284c7",
            fg="white",
            activebackground="#0369a1",
            activeforeground="white",
            command=Notifier.open_folder,
            **btn_style
        ).pack(fill=tk.X, pady=3)

        tk.Button(
            btn_frame,
            text="🌐 Web Panelini Aç",
            bg="#1e293b",
            fg="#f8fafc",
            activebackground="#334155",
            activeforeground="white",
            command=lambda: webbrowser.open(f"http://localhost:{config.port}"),
            **btn_style
        ).pack(fill=tk.X, pady=3)

        self.tunnel_btn = tk.Button(
            btn_frame,
            text="⚡ Dış Ağ Tüneli Başlat",
            bg="#4c1d95",
            fg="#e9d5ff",
            activebackground="#581c87",
            activeforeground="white",
            command=self.toggle_tunnel,
            **btn_style
        )
        self.tunnel_btn.pack(fill=tk.X, pady=3)

        # Right Panel (Recent Files Table)
        right_panel = tk.Frame(main_frame, bg="#161f33", padx=18, pady=18, highlightbackground="#222f49", highlightthickness=1)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        right_header = tk.Frame(right_panel, bg="#161f33")
        right_header.pack(fill=tk.X, pady=(0, 12))

        tk.Label(
            right_header,
            text="📥 Gelen Dosyalar (Kayıpsız)",
            font=("Segoe UI", 13, "bold"),
            fg="#f8fafc",
            bg="#161f33"
        ).pack(side=tk.LEFT)

        self.count_label = tk.Label(
            right_header,
            text="0 dosya",
            font=("Segoe UI", 9),
            fg="#38bdf8",
            bg="#161f33"
        )
        self.count_label.pack(side=tk.RIGHT)

        # Treeview for received files
        tree_container = tk.Frame(right_panel, bg="#131b2e")
        tree_container.pack(fill=tk.BOTH, expand=True)

        columns = ("name", "size", "time", "speed")
        self.tree = ttk.Treeview(tree_container, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("name", text="Dosya Adı")
        self.tree.heading("size", text="Boyut")
        self.tree.heading("time", text="Saat")
        self.tree.heading("speed", text="Hız")

        self.tree.column("name", width=240, anchor="w")
        self.tree.column("size", width=80, anchor="center")
        self.tree.column("time", width=70, anchor="center")
        self.tree.column("speed", width=80, anchor="center")

        scrollbar = ttk.Scrollbar(tree_container, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Double click to open folder
        self.tree.bind("<Double-1>", lambda e: Notifier.open_folder())

        # Load existing files
        self.load_initial_files()

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
        self.count_label.configure(text=f"{len(files)} dosya")

    def _insert_file_to_tree(self, file_info: dict):
        self.tree.insert(
            "",
            0,
            values=(
                file_info.get("name", "Bilinmeyen"),
                file_info.get("formatted_size", "-"),
                file_info.get("timestamp", "-"),
                file_info.get("speed", "-"),
            )
        )

    def _on_file_received_event(self, file_info: dict):
        # Thread-safe UI update
        def update():
            self._insert_file_to_tree(file_info)
            total = len(self.tree.get_children())
            self.count_label.configure(text=f"{total} dosya")
        self.root.after(0, update)

    def _on_tunnel_url_ready(self, url: str):
        def update():
            self.update_qr()
            self.tunnel_btn.configure(text="⚡ Tüneli Kapat", bg="#991b1b")
        self.root.after(0, update)

    def toggle_tunnel(self):
        if tunnel.is_running:
            tunnel.stop_tunnel()
            self.tunnel_btn.configure(text="⚡ Dış Ağ Tüneli Başlat", bg="#4c1d95")
            self.update_qr()
        else:
            self.tunnel_btn.configure(text="⏳ Başlatılıyor...", bg="#6b21a8")
            tunnel.start_tunnel(config.port, on_ready=self._on_tunnel_url_ready)

    def setup_events(self):
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def on_close(self):
        if self.on_close_callback:
            self.on_close_callback()
        else:
            self.root.destroy()
