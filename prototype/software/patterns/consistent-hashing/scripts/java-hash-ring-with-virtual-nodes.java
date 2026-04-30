// Input:  collection of node names, virtual node count
// Output: ConsistentHashRing with getNode(), addNode(), removeNode()

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentSkipListMap;

public class ConsistentHashRing {
    private final int vnodeCount;
    private final ConcurrentSkipListMap<Long, String> ring = new ConcurrentSkipListMap<>();

    public ConsistentHashRing(int vnodeCount) { this.vnodeCount = vnodeCount; }

    private long hash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] d = md.digest(key.getBytes(StandardCharsets.UTF_8));
            return ((long)(d[0]&0xFF) << 24) | ((long)(d[1]&0xFF) << 16)
                 | ((long)(d[2]&0xFF) << 8) | (d[3]&0xFF);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    public void addNode(String node) {
        for (int i = 0; i < vnodeCount; i++)
            ring.put(hash(node + "#vn" + i), node);
    }

    public void removeNode(String node) {
        for (int i = 0; i < vnodeCount; i++)
            ring.remove(hash(node + "#vn" + i));
    }

    public String getNode(String key) {
        if (ring.isEmpty()) return null;
        long h = hash(key);
        Map.Entry<Long, String> entry = ring.ceilingEntry(h);
        return (entry != null) ? entry.getValue() : ring.firstEntry().getValue();
    }
}
