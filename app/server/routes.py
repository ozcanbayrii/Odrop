from typing import List, Optional
from fastapi import APIRouter, Request, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, Response, FileResponse
from starlette.datastructures import UploadFile as StarletteUploadFile
from app.config import config
from app.core.receiver import receiver
from app.core.network import get_primary_ip, get_local_ips
from app.core.tunnel import tunnel
from app.core.notifier import Notifier
from app.core.shortcut_gen import generate_shortcut_plist

router = APIRouter()

# Connected WebSocket clients for real-time dashboard updates
connected_websockets: List[WebSocket] = []

async def broadcast_ws(event: str, data: dict):
    payload = {"event": event, "data": data}
    disconnected = []
    for ws in connected_websockets:
        try:
            await ws.send_json(payload)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in connected_websockets:
            connected_websockets.remove(ws)

# Register file receiver callback to broadcast via WebSocket
def on_file_received(file_info: dict):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcast_ws("file_received", file_info))
    except Exception:
        pass

receiver.add_listener(on_file_received)

@router.get("/api/info")
async def get_system_info():
    primary_ip = get_primary_ip()
    local_url = f"http://{primary_ip}:{config.port}"
    upload_url = f"{tunnel.public_url}/api/upload" if tunnel.public_url else f"{local_url}/api/upload"

    return {
        "device_name": config.device_name,
        "primary_ip": primary_ip,
        "all_ips": get_local_ips(),
        "port": config.port,
        "local_url": local_url,
        "upload_url": upload_url,
        "tunnel_url": tunnel.public_url,
        "tunnel_running": tunnel.is_running,
        "tunnel_status": tunnel.status_message,
        "save_dir": str(config.save_dir_path),
        "total_files": len(receiver.recent_files)
    }

@router.get("/api/files")
async def list_files():
    # Return in-memory recent files + disk scan
    recent = receiver.recent_files
    if not recent:
        recent = receiver.get_existing_files()
    return {"files": recent}

@router.post("/api/upload")
async def handle_upload(
    request: Request,
    filename: Optional[str] = Query(None)
):
    """
    High-performance, 100% lossless file upload endpoint.
    Supports:
    1. Standard multipart/form-data (iOS Shortcuts Form & Web Client)
    2. Raw binary POST (iOS Shortcuts File stream)
    """
    content_type = request.headers.get("content-type", "")
    saved_items = []

    if "multipart/form-data" in content_type:
        form = await request.form()
        for field_name in form:
            values = form.getlist(field_name)
            for value in values:
                if isinstance(value, StarletteUploadFile) or hasattr(value, "filename"):
                    file_info = await receiver.save_upload_file(value)
                    saved_items.append(file_info)
    else:
        # Raw binary stream fallback
        target_name = (
            filename
            or request.headers.get("x-filename")
            or request.headers.get("x-file-name")
            or "iphone_aktarim"
        )
        
        # Wrap stream in a minimal interface matching UploadFile
        class StreamWrapper:
            def __init__(self, req, name, c_type):
                self._req = req
                self.filename = name
                self.content_type = c_type
                self._stream = req.stream()

            async def read(self, size: int = 1024 * 1024):
                try:
                    return await anext(self._stream)
                except (StopAsyncIteration, Exception):
                    return b""

        wrapper = StreamWrapper(request, target_name, content_type)
        file_info = await receiver.save_upload_file(wrapper, custom_name=target_name)
        saved_items.append(file_info)

    return {
        "status": "success",
        "message": f"{len(saved_items)} dosya başarıyla bilgisayara kaydedildi.",
        "files": saved_items
    }

@router.post("/api/open-folder")
async def open_save_folder():
    Notifier.open_folder()
    return {"status": "ok", "folder": str(config.save_dir_path)}

@router.post("/api/tunnel/toggle")
async def toggle_tunnel():
    if tunnel.is_running:
        tunnel.stop_tunnel()
        await broadcast_ws("tunnel_updated", {"running": False, "url": None, "status": "Kapalı"})
        return {"status": "stopped", "running": False}
    else:
        tunnel.start_tunnel(config.port, on_ready=lambda url: None)
        await broadcast_ws("tunnel_updated", {"running": True, "url": tunnel.public_url, "status": "Başlatılıyor..."})
        return {"status": "starting", "running": True}

@router.get("/shortcut/download")
async def download_shortcut():
    """Generates and serves the dynamic Apple Shortcut file."""
    primary_ip = get_primary_ip()
    upload_url = f"{tunnel.public_url}/api/upload" if tunnel.public_url else f"http://{primary_ip}:{config.port}/api/upload"
    shortcut_data = generate_shortcut_plist(upload_url)

    return Response(
        content=shortcut_data,
        media_type="application/x-apple-shortcut",
        headers={
            "Content-Disposition": 'attachment; filename="ODrop_Gonder.shortcut"',
            "Cache-Control": "no-cache"
        }
    )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    try:
        while True:
            # Keepalive listener
            data = await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)
