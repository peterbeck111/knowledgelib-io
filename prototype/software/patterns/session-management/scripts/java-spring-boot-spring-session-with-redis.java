// Input:  Spring Boot application with Redis
// Output: Distributed session management via Spring Session

// application.yml
// spring:
//   session:
//     store-type: redis
//     timeout: 30m
//   data:
//     redis:
//       host: localhost
//       port: 6379
// server:
//   servlet:
//     session:
//       cookie:
//         http-only: true
//         secure: true
//         same-site: lax
//         name: sid

// SecurityConfig.java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)
public class SessionConfig {
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer s = new DefaultCookieSerializer();
        s.setCookieName("sid");
        s.setUseHttpOnlyCookie(true);
        s.setUseSecureCookie(true);
        s.setSameSite("Lax");
        return s;
    }
}
