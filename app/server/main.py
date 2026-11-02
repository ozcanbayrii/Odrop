import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import config
from app.server.routes import router
from app.core.network import MDNSAdvertiser
from app.core.tunnel import tunnel

def get_bundle_dir() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent.parent

bundle_base = get_bundle_dir()
STATIC_DIR = bundle_base / "app" / "static"
if not STATIC_DIR.exists():
    STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

TEMPLATES_DIR = bundle_base / "app" / "templates"
if not TEMPLATES_DIR.exists():
    TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

mdns_advertiser = MDNSAdvertiser(port=config.port, service_name="ODrop")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[ODrop Server] Starting on port {config.port}...")
    mdns_advertiser.start()
    if config.remote_tunnel_enabled:
        tunnel.start_tunnel(config.port)
    yield
    # Shutdown
    print("[ODrop Server] Shutting down...")
    mdns_advertiser.stop()
    if tunnel.is_running:
        tunnel.stop_tunnel()

app = FastAPI(
    title="ODrop",
    description="AirDrop-like Seamless File Transfer from iOS to Windows",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static directory
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include routes
app.include_router(router)

@app.get("/")
async def serve_index():
    index_file = TEMPLATES_DIR / "index.html"
    return FileResponse(index_file)
