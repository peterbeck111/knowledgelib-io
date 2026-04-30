// Input:  User-supplied URL string
// Output: ResponseEntity or throws SecurityException if URL targets blocked IP

import java.net.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

public class SsrfSafeFetcher {
    private static final RestTemplate restTemplate = new RestTemplate();

    public static boolean isBlockedIP(InetAddress addr) {
        return addr.isLoopbackAddress()
            || addr.isLinkLocalAddress()
            || addr.isSiteLocalAddress()
            || addr.isAnyLocalAddress()
            || addr.isMulticastAddress();
    }

    public static ResponseEntity<String> safeFetch(String userUrl)
            throws Exception {
        URL parsed = new URL(userUrl);
        String protocol = parsed.getProtocol();
        if (!"http".equals(protocol) && !"https".equals(protocol)) {
            throw new SecurityException("Blocked scheme: " + protocol);
        }

        // Resolve and validate IP before requesting
        InetAddress[] addresses = InetAddress.getAllByName(parsed.getHost());
        for (InetAddress addr : addresses) {
            if (isBlockedIP(addr)) {
                throw new SecurityException(
                    "Blocked IP: " + addr.getHostAddress());
            }
        }

        // Use RestTemplate without redirect following
        HttpHeaders headers = new HttpHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        return restTemplate.exchange(
            userUrl, HttpMethod.GET, entity, String.class);
    }
}
