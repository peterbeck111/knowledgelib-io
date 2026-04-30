// Input:  Authenticated user details
// Output: Signed JWT string

// implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
// runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.6'
// runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.6'
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Date;

KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
kpg.initialize(4096);
KeyPair keyPair = kpg.generateKeyPair();

// Sign
String token = Jwts.builder()
    .subject("user-123")
    .issuer("https://api.example.com")
    .audience().add("https://app.example.com").and()
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + 900_000)) // 15 min
    .signWith(keyPair.getPrivate(), Jwts.SIG.RS256) // Explicit algorithm
    .compact();

// Verify (hard-coded key and algorithm)
var claims = Jwts.parser()
    .verifyWith(keyPair.getPublic())
    .requireIssuer("https://api.example.com")
    .requireAudience("https://app.example.com")
    .build()
    .parseSignedClaims(token)
    .getPayload();
