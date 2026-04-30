# Input:  etcd cluster endpoint, service name
# Output: Elected leader performs work; followers watch and take over on failure
# Deps:   pip install etcd3==0.12.0

import etcd3
import time
import socket
import threading

LEASE_TTL = 15       # seconds
REFRESH_INTERVAL = 5 # seconds (must be < LEASE_TTL)
ELECTION_KEY = '/election/my-service'

client = etcd3.client(host='localhost', port=2379)
node_id = socket.gethostname()

def keep_lease_alive(lease, stop_event):
    """Background thread to refresh the lease."""
    while not stop_event.is_set():
        try:
            lease.refresh()
        except Exception:
            break  # Lease expired or connection lost
        time.sleep(REFRESH_INTERVAL)

def run_as_leader(lease):
    """Execute leader responsibilities."""
    stop = threading.Event()
    t = threading.Thread(target=keep_lease_alive, args=(lease, stop), daemon=True)
    t.start()
    try:
        while True:
            print(f"[{node_id}] Leading... doing work")
            time.sleep(2)
    except Exception:
        stop.set()

def campaign():
    """Attempt to become leader; block until elected."""
    while True:
        lease = client.lease(ttl=LEASE_TTL)
        success, _ = client.transaction(
            compare=[client.transactions.create(ELECTION_KEY) == 0],
            success=[client.transactions.put(ELECTION_KEY, node_id, lease)],
            failure=[]
        )
        if success:
            print(f"[{node_id}] Elected as leader!")
            run_as_leader(lease)
        else:
            leader_val, _ = client.get(ELECTION_KEY)
            print(f"[{node_id}] Following leader: {leader_val.decode()}")
            # Watch for leader key deletion (leader failure)
            events, cancel = client.watch(ELECTION_KEY)
            for event in events:
                if isinstance(event, etcd3.events.DeleteEvent):
                    print(f"[{node_id}] Leader lost! Campaigning...")
                    cancel()
                    break
            time.sleep(0.1)  # Small delay to avoid thundering herd

campaign()
