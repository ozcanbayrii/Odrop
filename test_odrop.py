import sys
import os
import io
import time

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import httpx
import plistlib
import threading
from pathlib import Path
import uvicorn

from app.config import config
from app.server.main import app
from app.core.shortcut_gen import generate_shortcut_plist

def run_tests():
    print("==================================================")
    print("  ODrop Otomatik Testleri Başlatılıyor...")
    print("==================================================")

    # Use a test port and temp save dir
    test_port = 5298
    test_save_dir = Path.home() / "Downloads" / "ODrop_Test"
    config.save_dir = str(test_save_dir)

    # Start uvicorn in background thread
    u_config = uvicorn.Config(app, host="127.0.0.1", port=test_port, log_level="warning")
    server = uvicorn.Server(u_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    client = httpx.Client(base_url=f"http://127.0.0.1:{test_port}", timeout=10.0)

    # Wait for server to start
    connected = False
    for _ in range(15):
        time.sleep(0.3)
        try:
            r = client.get("/api/info")
            if r.status_code == 200:
                connected = True
                break
        except Exception:
            pass

    if not connected:
        raise RuntimeError("Test server failed to start within timeout.")

    try:
        # 1. Test Web Dashboard
        print("[1/6] Web arayüzü kontrol ediliyor...")
        resp = client.get("/")
        assert resp.status_code == 200, f"Status code: {resp.status_code}"
        assert "ODrop" in resp.text
        print("  [OK] Web arayüzü başarıyla yanıt verdi (200 OK)")

        # 2. Test /api/info
        print("[2/6] /api/info uç noktası kontrol ediliyor...")
        resp = client.get("/api/info")
        assert resp.status_code == 200
        info_data = resp.json()
        assert "primary_ip" in info_data
        assert "upload_url" in info_data
        print(f"  [OK] Sistem bilgisi alındı: IP={info_data['primary_ip']}, Port={info_data['port']}")

        # 3. Test /shortcut/download
        print("[3/6] Apple Shortcut (.shortcut) üretimi test ediliyor...")
        resp = client.get("/shortcut/download")
        assert resp.status_code == 200
        assert resp.headers.get("content-type") == "application/x-apple-shortcut"
        shortcut_plist = plistlib.loads(resp.content)
        assert "WFWorkflowActions" in shortcut_plist
        assert "ActionExtension" in shortcut_plist.get("WFWorkflowTypes", [])
        print(f"  [OK] Geçerli Apple Shortcut ikili plist dosyası üretildi ({len(resp.content)} bayt)")

        # 4. Test Lossless File Upload (Multipart Form - iPhone Kestirmeler formatı)
        print("[4/6] Kayıpsız dosya aktarımı (/api/upload - Multipart) test ediliyor...")
        sample_bytes = b"EXIF_RAW_LOSSLESS_TEST_IMAGE_BYTES_123456789"
        files = {
            "file": ("IMG_0492.HEIC", io.BytesIO(sample_bytes), "image/heic")
        }
        resp = client.post("/api/upload", files=files)
        assert resp.status_code == 200
        upload_res = resp.json()
        assert upload_res["status"] == "success"
        saved_file_info = upload_res["files"][0]
        saved_path = Path(saved_file_info["path"])
        assert saved_path.exists()
        assert saved_path.read_bytes() == sample_bytes
        print(f"  [OK] Dosya sıfır kayıpla kaydedildi: {saved_path.name} ({len(sample_bytes)} bayt)")

        # 5. Test Collision Avoidance (Duplicate Filename Protection)
        print("[5/6] Çakışma önleme (aynı isimli dosya koruması) test ediliyor...")
        resp2 = client.post("/api/upload", files=files)
        assert resp2.status_code == 200
        saved_file_info2 = resp2.json()["files"][0]
        saved_path2 = Path(saved_file_info2["path"])
        assert saved_path2.exists()
        assert saved_path2.name != saved_path.name
        assert "_1" in saved_path2.name
        print(f"  [OK] Önceki dosyanın üzerine yazılmadı, benzersiz isim verildi: {saved_path2.name}")

        # 6. Test File Listing
        print("[6/6] /api/files dosya listeleme kontrol ediliyor...")
        resp = client.get("/api/files")
        assert resp.status_code == 200
        files_list = resp.json()["files"]
        assert len(files_list) >= 2
        print(f"  [OK] Aktarılan dosyalar listelendi ({len(files_list)} adet dosya)")

        print("\n==================================================")
        print("  TUM TESTLER BASARIYLA GECTI! (6/6)")
        print("==================================================")

    finally:
        # Cleanup test files
        client.close()
        server.should_exit = True
        if test_save_dir.exists():
            for f in test_save_dir.iterdir():
                try:
                    f.unlink()
                except Exception:
                    pass
            try:
                test_save_dir.rmdir()
            except Exception:
                pass

if __name__ == "__main__":
    run_tests()
