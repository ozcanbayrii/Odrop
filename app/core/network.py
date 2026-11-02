import io
import socket
import base64
from typing import List, Optional
import qrcode
from zeroconf import Zeroconf, ServiceInfo

def get_local_ips() -> List[str]:
    """
    Returns a list of active non-loopback IPv4 addresses.
    Prioritizes the primary outbound interface.
    """
    ips = []
    # Primary outbound IP detection
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127."):
            ips.append(primary_ip)
    except Exception:
        pass

    # Secondary lookup via getaddrinfo
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            family, _, _, _, sockaddr = info
            if family == socket.AF_INET:
                ip = sockaddr[0]
                if not ip.startswith("127.") and ip not in ips:
                    ips.append(ip)
    except Exception:
        pass

    return ips if ips else ["127.0.0.1"]

def get_primary_ip() -> str:
    ips = get_local_ips()
    return ips[0] if ips else "127.0.0.1"

def generate_qr_code_base64(data: str) -> str:
    """Generates a QR code image encoded as Base64 PNG."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def generate_qr_code_image(data: str):
    """Generates a PIL Image object for GUI display."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color="#0f172a", back_color="#ffffff")

class MDNSAdvertiser:
    """Advertises ODrop on the local network via Bonjour/mDNS so Apple devices can discover it."""
    def __init__(self, port: int, service_name: str = "ODrop"):
        self.port = port
        self.service_name = service_name
        self.zeroconf: Optional[Zeroconf] = None
        self.service_info: Optional[ServiceInfo] = None

    def start(self):
        try:
            primary_ip = get_primary_ip()
            ip_bytes = socket.inet_aton(primary_ip)
            self.zeroconf = Zeroconf()
            server_name = f"{socket.gethostname().lower()}.local."
            self.service_info = ServiceInfo(
                type_="_http._tcp.local.",
                name=f"{self.service_name}._http._tcp.local.",
                addresses=[ip_bytes],
                port=self.port,
                properties={"path": "/", "app": "ODrop", "version": "1.0"},
                server=server_name
            )
            self.zeroconf.register_service(self.service_info)
            print(f"[mDNS] Registered service: {self.service_name} at {primary_ip}:{self.port} (odrop.local)")
        except Exception as e:
            print(f"[mDNS] Warning: Could not register mDNS service: {e}")

    def stop(self):
        if self.zeroconf and self.service_info:
            try:
                self.zeroconf.unregister_service(self.service_info)
                self.zeroconf.close()
                print("[mDNS] Service stopped.")
            except Exception:
                pass
            self.zeroconf = None
            self.service_info = None
