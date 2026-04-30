// Input:  Spring Boot app needing CORS for specific frontend origins
// Output: CORS headers on all /api/** endpoints

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins(
                        "https://app.example.com",
                        "https://staging.example.com"
                    )
                    .allowedMethods("GET", "POST", "PUT", "DELETE")
                    .allowedHeaders("Content-Type", "Authorization")
                    .exposedHeaders("X-Request-Id")
                    .allowCredentials(true)
                    .maxAge(600);  // Cache preflight for 10 minutes
            }
        };
    }
}

// With Spring Security, also enable CORS in SecurityFilterChain:
// http.cors(Customizer.withDefaults())
