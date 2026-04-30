# Input:  Concurrent text operations from multiple clients
# Output: Transformed operations that maintain document consistency

from dataclasses import dataclass
from typing import Literal
import json

@dataclass
class TextOp:
    """Represents a single text operation."""
    op_type: Literal["insert", "delete"]
    position: int
    text: str = ""       # for insert
    length: int = 0      # for delete
    client_id: str = ""
    revision: int = 0

def transform(op1: TextOp, op2: TextOp) -> TextOp:
    """Transform op1 against op2 (server-side OT).
    Returns a new op1' that accounts for op2 having been applied first."""
    if op1.op_type == "insert" and op2.op_type == "insert":
        if op1.position > op2.position or (
            op1.position == op2.position and op1.client_id > op2.client_id
        ):
            return TextOp("insert", op1.position + len(op2.text),
                          op1.text, client_id=op1.client_id, revision=op1.revision)
        return op1
    elif op1.op_type == "insert" and op2.op_type == "delete":
        if op1.position > op2.position:
            return TextOp("insert", max(op1.position - op2.length, op2.position),
                          op1.text, client_id=op1.client_id, revision=op1.revision)
        return op1
    elif op1.op_type == "delete" and op2.op_type == "insert":
        if op1.position >= op2.position:
            return TextOp("delete", op1.position + len(op2.text),
                          length=op1.length, client_id=op1.client_id, revision=op1.revision)
        return op1
    else:  # both delete
        if op1.position >= op2.position + op2.length:
            return TextOp("delete", op1.position - op2.length,
                          length=op1.length, client_id=op1.client_id, revision=op1.revision)
        elif op1.position + op1.length <= op2.position:
            return op1
        else:
            # Overlapping deletes — shrink op1 to avoid double-delete
            overlap_start = max(op1.position, op2.position)
            overlap_end = min(op1.position + op1.length, op2.position + op2.length)
            new_length = op1.length - (overlap_end - overlap_start)
            new_pos = min(op1.position, op2.position)
            return TextOp("delete", new_pos, length=max(new_length, 0),
                          client_id=op1.client_id, revision=op1.revision)

# Usage
op_alice = TextOp("insert", 5, "Hello", client_id="alice", revision=1)
op_bob = TextOp("insert", 3, "World", client_id="bob", revision=1)
op_alice_prime = transform(op_alice, op_bob)
print(f"Alice's op transformed: insert at position {op_alice_prime.position}")
# Alice's op transformed: insert at position 10
