# Input:  filepath (str), api_base (str), token (str)
# Output: dict with file_id and upload status

import hashlib
import requests
from requests.adapters import HTTPAdapter, Retry

CHUNK_SIZE = 4 * 1024 * 1024  # 4MB

session = requests.Session()
session.mount("https://", HTTPAdapter(
    max_retries=Retry(total=3, backoff_factor=0.5,
                      status_forcelist=[500, 502, 503])
))

def upload_chunked(filepath: str, api_base: str, token: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    chunks = []
    with open(filepath, "rb") as f:
        idx = 0
        while data := f.read(CHUNK_SIZE):
            chunk_hash = hashlib.sha256(data).hexdigest()
            # Check dedup
            if session.head(f"{api_base}/chunks/{chunk_hash}",
                           headers=headers).status_code == 404:
                url_resp = session.post(f"{api_base}/chunks/upload-url",
                    json={"hash": chunk_hash, "size": len(data)},
                    headers=headers)
                session.put(url_resp.json()["url"], data=data,
                           headers={"Content-Type": "application/octet-stream"})
            chunks.append({"index": idx, "hash": chunk_hash, "size": len(data)})
            idx += 1
    return session.post(f"{api_base}/files",
        json={"name": filepath.rsplit("/", 1)[-1], "chunks": chunks},
        headers=headers).json()
