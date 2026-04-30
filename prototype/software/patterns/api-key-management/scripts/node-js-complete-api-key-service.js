// Input:  client_id, scopes array
// Output: { rawKey, prefix, keyHash, expiresAt }

const crypto = require('crypto');

class ApiKeyService {
  generateKey(type = 'sk', env = 'live') {
    const payload = crypto.randomBytes(32).toString('hex');
    const rawKey = `${type}_${env}_${payload}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 12);
    return { rawKey, prefix, keyHash };
  }

  async createKey(clientId, scopes = ['read'], ttlDays = 90) {
    const { rawKey, prefix, keyHash } = this.generateKey();
    const expiresAt = new Date(Date.now() + ttlDays * 86400000);
    await this.db.query(
      `INSERT INTO api_keys (key_hash, prefix, client_id, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [keyHash, prefix, clientId, scopes, expiresAt]
    );
    return { rawKey, prefix, expiresAt }; // rawKey shown once only
  }

  async validateKey(rawKey) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const result = await this.db.query(
      `SELECT client_id, scopes, expires_at FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [keyHash]
    );
    return result.rows[0] || null;
  }
}
