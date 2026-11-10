"""
ODrop Uzak Gelen Kutusu
=======================
Windows uygulamasını VPS'teki sinyal sunucusuna "alıcı" olarak bağlar.
Biri davet linki (https://<sunucu>/s/<token>) ile dosya göndermek istediğinde
onay sorar, kabul edilirse WebRTC DataChannel üzerinden dosyaları alıp
parça parça doğrudan kayıt klasörüne yazar (RAM'de biriktirmez).

Protokol web/public/js/webrtc.js ile birebir aynıdır.
"""
import asyncio
import json
import os
import sys
import threading
import time
from pathlib import Path
from typing import Callable, Dict, List, Optional

from app.config import config
from app.core.receiver import receiver, sanitize_filename, get_unique_filepath, format_size
from app.core.notifier import Notifier

try:
    import websockets
    from aiortc import RTCConfiguration, RTCIceServer, RTCPeerConnection, RTCSessionDescription
    from aiortc.sdp import candidate_from_sdp
    AIORTC_AVAILABLE = True
except Exception as _e:  # pragma: no cover
    AIORTC_AVAILABLE = False
    _IMPORT_ERROR = _e

PART_SUFFIX = ".odrop-part"


def ask_user_accept(sender: str, files: List[dict], total_size: int) -> bool:
    """Kullanıcıya Windows onay kutusu gösterir (bloklayan çağrı, ayrı thread'de çalıştırılır)."""
    if config.remote_auto_accept:
        return True
    names = "\n".join(f"  • {f.get('name', '?')} ({format_size(int(f.get('size') or 0))})" for f in files[:8])
    if len(files) > 8:
        names += f"\n  … ve {len(files) - 8} dosya daha"
    text = (
        f"{sender} sana {len(files)} dosya göndermek istiyor "
        f"(toplam {format_size(total_size)}).\n\n{names}\n\nKabul etmek istiyor musun?"
    )
    if sys.platform == "win32":
        import ctypes
        MB_YESNO, MB_ICONQUESTION, MB_TOPMOST, MB_SETFOREGROUND, IDYES = 0x4, 0x20, 0x40000, 0x10000, 6
        res = ctypes.windll.user32.MessageBoxW(None, text, "ODrop — Gelen dosya isteği", MB_YESNO | MB_ICONQUESTION | MB_TOPMOST | MB_SETFOREGROUND)
        return res == IDYES
    print("[RemoteInbox] Onay arayüzü yok (Windows dışı), istek reddedildi:", text)
    return False


def copy_to_clipboard(text: str) -> bool:
    try:
        if sys.platform == "win32":
            import subprocess
            subprocess.run(["clip"], input=text.encode("utf-16le"), check=True, creationflags=0x08000000)
            return True
    except Exception as e:
        print(f"[RemoteInbox] Panoya kopyalanamadı: {e}")
    return False


class IncomingFile:
    """Tek bir gelen dosyanın diske akışlı yazımı."""

    def __init__(self, meta: dict, sender: str):
        self.meta = meta
        self.sender = sender
        self.expected = int(meta.get("size") or 0)
        self.received = 0
        self.started = time.time()
        save_dir = config.save_dir_path
        clean = sanitize_filename(meta.get("name") or "dosya")
        self.final_path = get_unique_filepath(save_dir, clean)
        self.part_path = self.final_path.with_name(self.final_path.name + PART_SUFFIX)
        self.fh = open(self.part_path, "wb", buffering=1024 * 1024)

    def write(self, data: bytes):
        self.fh.write(data)
        self.received += len(data)

    def finish(self) -> Path:
        self.fh.close()
        if self.received != self.expected:
            self.part_path.unlink(missing_ok=True)
            raise IOError(f"Boyut uyuşmuyor ({self.received}/{self.expected})")
        # Bu arada aynı isimde dosya oluşmuşsa yeniden benzersiz isim al
        target = self.final_path if not self.final_path.exists() else get_unique_filepath(self.final_path.parent, self.final_path.name)
        os.replace(self.part_path, target)
        return target

    def abort(self):
        try:
            self.fh.close()
        except Exception:
            pass
        try:
            self.part_path.unlink(missing_ok=True)
        except Exception:
            pass


class ReceiveSession:
    def __init__(self, inbox: "RemoteInbox", session_id: str, sender: str, ice_servers: list):
        self.inbox = inbox
        self.session_id = session_id
        self.sender = sender
        self.pc = RTCPeerConnection(RTCConfiguration(iceServers=self._ice(ice_servers)))
        self.channel = None
        self.current: Optional[IncomingFile] = None
        self.saved: List[dict] = []
        self.signal_queue: asyncio.Queue = asyncio.Queue()
        self.closed = False

        @self.pc.on("datachannel")
        def on_datachannel(channel):
            self.channel = channel
            print(f"[RemoteInbox] DataChannel açıldı ({sender})")

            @channel.on("message")
            def on_message(msg):
                try:
                    self._on_message(msg)
                except Exception as e:
                    print(f"[RemoteInbox] Mesaj işleme hatası: {e}")

            @channel.on("close")
            def on_close():
                if self.current:
                    self.current.abort()
                    self.current = None

        @self.pc.on("connectionstatechange")
        async def on_state():
            st = self.pc.connectionState
            print(f"[RemoteInbox] Bağlantı durumu: {st}")
            if st in ("failed", "closed"):
                await self.close()

    @staticmethod
    def _ice(servers: list) -> list:
        out = []
        for s in servers or []:
            urls = s.get("urls")
            urls = urls if isinstance(urls, list) else [urls]
            urls = [u for u in urls if u]
            if not urls:
                continue
            out.append(RTCIceServer(urls=urls, username=s.get("username"), credential=s.get("credential")))
        return out

    # -------------------------------------------------- sinyal
    async def run_signals(self):
        while not self.closed:
            sig = await self.signal_queue.get()
            if sig is None:
                break
            try:
                await self._handle_signal(sig)
            except Exception as e:
                print(f"[RemoteInbox] Sinyal hatası: {e}")

    async def _handle_signal(self, sig: dict):
        t = sig.get("type")
        if t == "offer":
            sdp = sig.get("sdp") or {}
            await self.pc.setRemoteDescription(RTCSessionDescription(sdp=sdp.get("sdp"), type="offer"))
            answer = await self.pc.createAnswer()
            await self.pc.setLocalDescription(answer)  # aiortc: adaylar SDP'nin içinde
            await self.inbox.send({
                "type": "signal",
                "sessionId": self.session_id,
                "data": {"type": "answer", "sdp": {"type": "answer", "sdp": self.pc.localDescription.sdp}},
            })
        elif t == "candidate":
            c = sig.get("candidate") or {}
            line = c.get("candidate") or ""
            if not line:
                return
            if line.startswith("candidate:"):
                line = line[len("candidate:"):]
            cand = candidate_from_sdp(line)
            cand.sdpMid = c.get("sdpMid")
            cand.sdpMLineIndex = c.get("sdpMLineIndex")
            await self.pc.addIceCandidate(cand)

    # -------------------------------------------------- veri kanalı
    def _send_ctrl(self, obj: dict):
        if self.channel and self.channel.readyState == "open":
            self.channel.send(json.dumps(obj))

    def _on_message(self, msg):
        if isinstance(msg, str):
            data = json.loads(msg)
            action = data.get("action")
            if action == "file-start":
                if self.current:
                    self.current.abort()
                self.current = IncomingFile(data, self.sender)
                self.inbox.emit_progress(self.sender, data.get("name"), 0, self.current.expected)
            elif action == "file-end":
                self._finish_current(data.get("id"))
            elif action == "batch-done":
                total = sum(f["size"] for f in self.saved)
                Notifier.show_toast(
                    title=f"📥 {self.sender}: {len(self.saved)} dosya alındı",
                    message=f"Toplam {format_size(total)} orijinal kalitesiyle kaydedildi.",
                    folder_path=str(config.save_dir_path),
                )
            return

        if self.current is not None:
            self.current.write(msg)
            self.inbox.emit_progress(self.sender, self.current.meta.get("name"), self.current.received, self.current.expected)

    def _finish_current(self, file_id):
        cur = self.current
        self.current = None
        if cur is None:
            return
        try:
            path = cur.finish()
            elapsed = time.time() - cur.started
            info = receiver.register_saved_file(path, cur.meta.get("name") or path.name, cur.received, elapsed, sender=self.sender)
            self.saved.append(info)
            self._send_ctrl({"action": "file-saved", "id": file_id, "size": cur.received, "ok": True})
            print(f"[RemoteInbox] Kaydedildi: {path} ({format_size(cur.received)})")
        except Exception as e:
            cur.abort()
            self._send_ctrl({"action": "file-saved", "id": file_id, "size": cur.received, "ok": False, "error": str(e)})
            print(f"[RemoteInbox] Kaydetme hatası: {e}")

    async def close(self):
        if self.closed:
            return
        self.closed = True
        if self.current:
            self.current.abort()
            self.current = None
        await self.signal_queue.put(None)
        try:
            await self.pc.close()
        except Exception:
            pass
        self.inbox.sessions.pop(self.session_id, None)


class RemoteInbox:
    def __init__(self):
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.thread: Optional[threading.Thread] = None
        self.ws = None
        self.connected = False
        self.status_message = "Kapalı"
        self.sessions: Dict[str, ReceiveSession] = {}
        self.invites: List[dict] = []
        self._stop = False
        self._pending_invite: Optional[asyncio.Future] = None
        self.status_listeners: List[Callable[[str], None]] = []
        self.progress_listeners: List[Callable[[dict], None]] = []
        self._last_progress = 0.0

    # -------------------------------------------------- yaşam döngüsü
    def start(self):
        if not AIORTC_AVAILABLE:
            self._set_status(f"Devre dışı: aiortc yüklenemedi ({_IMPORT_ERROR})")
            return
        if not config.remote_owner_key:
            self._set_status("Kapalı (remote_owner_key ayarlı değil)")
            return
        if self.thread and self.thread.is_alive():
            return
        self._stop = False
        self.thread = threading.Thread(target=self._thread_main, daemon=True, name="ODropRemoteInbox")
        self.thread.start()

    def stop(self):
        self._stop = True
        if self.loop:
            async def _shutdown():
                for s in list(self.sessions.values()):
                    await s.close()
                if self.ws:
                    await self.ws.close()
            try:
                asyncio.run_coroutine_threadsafe(_shutdown(), self.loop).result(timeout=3)
            except Exception:
                pass

    def _thread_main(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._run_forever())

    def _set_status(self, msg: str):
        self.status_message = msg
        print(f"[RemoteInbox] {msg}")
        for cb in self.status_listeners:
            try:
                cb(msg)
            except Exception:
                pass

    def emit_progress(self, sender, name, done, total):
        now = time.time()
        if done < total and now - self._last_progress < 0.25:
            return
        self._last_progress = now
        info = {"sender": sender, "name": name, "done": done, "total": total,
                "progress": int(done * 100 / total) if total else 100}
        for cb in self.progress_listeners:
            try:
                cb(info)
            except Exception:
                pass

    async def send(self, obj: dict):
        if self.ws:
            await self.ws.send(json.dumps(obj))

    # -------------------------------------------------- bağlantı
    async def _run_forever(self):
        backoff = 2
        while not self._stop:
            url = config.remote_server_url
            try:
                self._set_status(f"Bağlanıyor: {url}")
                async with websockets.connect(url, ping_interval=25, ping_timeout=20, max_size=2 ** 20) as ws:
                    self.ws = ws
                    await self.send({"type": "owner-auth", "key": config.remote_owner_key,
                                     "device": f"{config.device_name}", "kind": "desktop"})
                    async for raw in ws:
                        backoff = 2
                        try:
                            msg = json.loads(raw)
                        except Exception:
                            continue
                        await self._on_ws_message(msg)
            except Exception as e:
                if not self._stop:
                    self._set_status(f"Bağlantı yok ({type(e).__name__}), {backoff} sn sonra tekrar denenecek")
            finally:
                self.ws = None
                self.connected = False
            if self._stop:
                break
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)

    async def _on_ws_message(self, m: dict):
        t = m.get("type")
        if t == "owner-ok":
            self.connected = True
            self._set_status("🟢 Uzak gelen kutusu aktif")
        elif t == "owner-error":
            self._set_status(f"Sunucu hatası: {m.get('message')}")
            if m.get("code") in ("bad-key", "disabled"):
                self._stop = True
                await self.ws.close()
            elif self._pending_invite and not self._pending_invite.done():
                self._pending_invite.set_exception(RuntimeError(m.get("message")))
        elif t == "invites":
            self.invites = m.get("invites") or []
        elif t == "invite-created":
            if self._pending_invite and not self._pending_invite.done():
                self._pending_invite.set_result(m.get("invite"))
        elif t == "transfer-request":
            asyncio.ensure_future(self._handle_request(m))
        elif t == "session-start":
            sid = m["sessionId"]
            sess = ReceiveSession(self, sid, m.get("senderName") or "Misafir", m.get("iceServers") or [])
            self.sessions[sid] = sess
            asyncio.ensure_future(sess.run_signals())
            Notifier.show_toast(
                title=f"⏬ {sess.sender} dosya gönderiyor",
                message=f"{len(m.get('files') or [])} dosya alınıyor…",
                folder_path=str(config.save_dir_path),
            )
        elif t == "signal":
            sess = self.sessions.get(m.get("sessionId"))
            if sess:
                await sess.signal_queue.put(m.get("data") or {})
        elif t == "session-ended":
            sess = self.sessions.get(m.get("sessionId"))
            if sess:
                # Kanal kapanana kadar bekleyen verilerin işlenmesi için kısa gecikme
                await asyncio.sleep(2)
                await sess.close()

    async def _handle_request(self, m: dict):
        Notifier.play_chime()
        accepted = await asyncio.get_running_loop().run_in_executor(
            None, ask_user_accept, m.get("senderName") or "Misafir", m.get("files") or [], int(m.get("totalSize") or 0)
        )
        await self.send({"type": "transfer-accept" if accepted else "transfer-reject", "requestId": m.get("requestId")})

    # -------------------------------------------------- davet (tepsi menüsünden)
    def http_base(self) -> str:
        u = config.remote_server_url
        return "https://" + u[len("wss://"):] if u.startswith("wss://") else "http://" + u[len("ws://"):]

    def create_invite(self, ttl_minutes: int = 1440, label: str = "") -> str:
        """Bloklayan çağrı (GUI/tepsi thread'inden). Davet URL'sini döndürür."""
        if not self.loop or not self.connected:
            raise RuntimeError("Uzak gelen kutusu bağlı değil")

        async def _create():
            self._pending_invite = self.loop.create_future()
            await self.send({"type": "invite-create", "ttlMinutes": ttl_minutes, "label": label})
            return await asyncio.wait_for(self._pending_invite, timeout=10)

        inv = asyncio.run_coroutine_threadsafe(_create(), self.loop).result(timeout=12)
        return f"{self.http_base()}/s/{inv['token']}"


remote_inbox = RemoteInbox()
