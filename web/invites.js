/**
 * ODrop Invite Store
 * Tek kullanımlık + süreli davet linkleri. Diskte JSON olarak saklanır,
 * böylece sunucu yeniden başlasa da linkler geçerliliğini korur.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_TTL_MINUTES = [15, 60, 360, 1440, 4320, 10080]; // 15dk, 1s, 6s, 1g, 3g, 7g
const DEFAULT_TTL_MINUTES = 1440;
const MAX_ACTIVE_INVITES = 50;

class InviteStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.invites = new Map(); // token -> invite
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const arr = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        for (const inv of arr) this.invites.set(inv.token, inv);
      }
    } catch (e) {
      console.error('[Invites] Yüklenemedi:', e.message);
    }
    this.prune();
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(Array.from(this.invites.values()), null, 2), { mode: 0o600 });
      fs.renameSync(tmp, this.filePath);
    } catch (e) {
      console.error('[Invites] Kaydedilemedi:', e.message);
    }
  }

  /** Süresi 1 günden fazla önce dolmuş veya kullanılmış kayıtları temizler. */
  prune() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let changed = false;
    for (const [token, inv] of this.invites) {
      const deadAt = inv.usedAt || inv.revokedAt || inv.expiresAt;
      if (deadAt < cutoff) {
        this.invites.delete(token);
        changed = true;
      }
    }
    if (changed) this.save();
  }

  create({ ttlMinutes, label }) {
    this.prune();
    if (this.listActive().length >= MAX_ACTIVE_INVITES) {
      throw new Error('Çok fazla aktif davet var. Önce bazılarını iptal et.');
    }
    const ttl = ALLOWED_TTL_MINUTES.includes(Number(ttlMinutes)) ? Number(ttlMinutes) : DEFAULT_TTL_MINUTES;
    const token = crypto.randomBytes(16).toString('base64url'); // 128-bit, tahmin edilemez
    const now = Date.now();
    const invite = {
      token,
      label: String(label || '').trim().slice(0, 40),
      createdAt: now,
      expiresAt: now + ttl * 60 * 1000,
      usedAt: null,
      usedBy: null,
      revokedAt: null,
    };
    this.invites.set(token, invite);
    this.save();
    return invite;
  }

  /** Geçerliyse daveti, değilse { error } döndürür. */
  check(token) {
    const inv = this.invites.get(String(token || ''));
    if (!inv) return { error: 'invalid' };
    if (inv.revokedAt) return { error: 'revoked' };
    if (inv.usedAt) return { error: 'used' };
    if (Date.now() > inv.expiresAt) return { error: 'expired' };
    return { invite: inv };
  }

  consume(token, senderName) {
    const inv = this.invites.get(token);
    if (!inv) return;
    inv.usedAt = Date.now();
    inv.usedBy = String(senderName || '').slice(0, 40);
    this.save();
  }

  revoke(token) {
    const inv = this.invites.get(token);
    if (!inv) return false;
    inv.revokedAt = Date.now();
    this.save();
    return true;
  }

  listActive() {
    const now = Date.now();
    return Array.from(this.invites.values())
      .filter((i) => !i.usedAt && !i.revokedAt && i.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  listRecent() {
    return Array.from(this.invites.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
      .map((i) => ({
        ...i,
        status: i.revokedAt ? 'revoked' : i.usedAt ? 'used' : Date.now() > i.expiresAt ? 'expired' : 'active',
      }));
  }
}

module.exports = { InviteStore, ALLOWED_TTL_MINUTES, DEFAULT_TTL_MINUTES };
