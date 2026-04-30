# Input:  Code that processes both text and binary data
# Output: Python 3 compatible version with explicit type handling

import json
import hashlib

def process_api_response(raw_response: bytes) -> dict:
    """Decode bytes from network, process as text, return parsed data."""
    # Decode bytes to str at the boundary [src1, src3]
    text = raw_response.decode("utf-8")

    # Work with text (str) internally
    parsed = json.loads(text)
    name = parsed["name"]  # str in Python 3

    # Encode back to bytes only when needed for binary operations
    name_hash = hashlib.sha256(name.encode("utf-8")).hexdigest()
    parsed["name_hash"] = name_hash
    return parsed

def read_mixed_file(text_path: str, binary_path: str):
    """Demonstrate correct file I/O for text vs binary."""
    # Text files: always specify encoding [src1]
    with open(text_path, "r", encoding="utf-8") as f:
        lines = f.readlines()  # List[str]

    # Binary files: use 'rb' mode [src5]
    with open(binary_path, "rb") as f:
        data = f.read()  # bytes

    # CAUTION: bytes indexing returns int in Python 3
    first_byte = data[0]  # int, e.g., 137 for PNG header
    # NOT a single-byte string like in Python 2

    return lines, data
