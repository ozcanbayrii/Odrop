# Remote Lossless File Transfer via Invite Links

Users on different networks, cellular data, or remote locations can send original-quality files directly to your computer or browser.

```text
 Sender (iPhone Safari)                   VPS (your-domain.com)               You
 ----------------------                   ---------------------               ---
 Opens /s/<invite> link  -- request ->    signaling server  -- notify ->      Windows desktop app
                                          (never sees files)                  /inbox browser tab
                         <--------- WebRTC P2P (DTLS encrypted) --------->    "Accept"
                         (coturn relay fallback; data remains encrypted)
```

## How It Works

1. Generate an invite link:
   - In your browser: Navigate to `https://<your-server-or-domain>/inbox`, enter your owner key, and click "Create Link".
   - Or from the Windows Desktop client: Right-click the system tray icon and select "Create Invite Link (1h / 24h)". The link is copied to your clipboard automatically.
2. Send the link to the sender (via messaging apps, email, etc.).
3. The sender opens the link on their device, enters their name, selects photos/videos from the gallery or files, and taps "Send".
4. An approval prompt appears on your screen (native Windows dialog box or browser notification card). When you click "Accept", the transfer begins.
5. Storage:
   - Windows Desktop Client: Streams chunks directly to your `Downloads\ODrop` folder (no file size limit).
   - Desktop Browser (Chrome/Edge): Streams chunks directly to your selected directory using the File System Access API. On browsers without directory access (e.g., Safari/Firefox), files are buffered in memory first; using the desktop client is recommended for large video files.

Invite links are single-use and time-limited (15 minutes to 7 days). Once accepted, the link expires immediately. Pending links can be revoked from the `/inbox` dashboard.

## Windows Client Configuration

Add the following configuration to `odrop_settings.json` located in the application directory:

```json
{
  "remote_inbox_enabled": true,
  "remote_server_url": "wss://your-domain.com",
  "remote_owner_key": "YOUR_SERVER_ODROP_OWNER_KEY",
  "remote_auto_accept": false
}
```

Setting `remote_auto_accept: true` bypasses the confirmation prompt and accepts incoming transfers automatically.

Required Python dependencies:
```bash
pip install -r requirements.txt
```

To recompile the standalone Windows binary:
```bash
python -m PyInstaller ODrop.spec
```

## Server Setup (VPS)

```bash
cd /path/to/odrop && git pull
sudo bash deploy/setup-vps.sh /path/to/odrop your-domain.com
```

The setup script only modifies the ODrop directory and coturn service:

- Generates `web/.env`: `ODROP_OWNER_KEY` (owner key), `TURN_SECRET`, and `TURN_HOST`
- Installs and configures coturn (`/etc/turnserver.conf`) with short-lived credentials and private-network loopback protection.
- Opens required firewall (ufw) ports if active: `3478/udp+tcp`, `5349/tcp`, `49160-49260/udp`
- Automatically restarts PM2 or systemd services after creating a backup archive (`/root/odrop-backup-*.tgz`).

Verify deployment:
```bash
curl https://your-domain.com/healthz
```
Expected response: `{"ok":true,"invites":true,"turn":true}`

## iPhone Quality Notes

iOS Safari may automatically convert certain media formats when picking from the Photos app (e.g., converting HEIC photos to JPEG, or HEVC video to H.264). This conversion happens within the iOS media picker prior to upload. To guarantee original bit-for-bit quality:

- If an "Options" button appears at the bottom of the photo picker, select "Current" instead of "Automatic", or
- Save the video to the iOS "Files" app first, and upload via "Select Files".

The transfer protocol itself is 100% lossless bit-by-bit. File size and integrity are verified upon completion before reporting delivery.

## Security

- Files are never stored on the server. The server only performs signaling and peer discovery.
- Even when using the TURN relay, all media data is end-to-end encrypted using WebRTC DTLS. The relay server cannot inspect the payload.
- Invite tokens use 128-bit cryptographic randomness. Pages enforce `Referrer-Policy: no-referrer` and `noindex`.
- TURN credentials expire every 12 hours and are issued strictly to authenticated peer sessions.
