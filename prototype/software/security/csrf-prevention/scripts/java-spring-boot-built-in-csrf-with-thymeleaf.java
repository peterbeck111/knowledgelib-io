// SecurityConfig.java -- Spring Security 6.x
import org.springframework.security.config.Customizer;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf
            // Store CSRF token in cookie (readable by JS for AJAX)
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
        );
    return http.build();
}

// For stateless APIs with JWT -- disable CSRF (no cookies = no CSRF):
// http.csrf(csrf -> csrf.disable());

// Thymeleaf template (token auto-injected):
// <form th:action="@{/transfer}" method="post">
//   <!-- Thymeleaf auto-adds hidden _csrf field -->
//   <input name="amount" type="number" />
//   <button type="submit">Transfer</button>
// </form>

// For AJAX with Spring:
// const token = document.querySelector('meta[name="_csrf"]').content;
// const header = document.querySelector('meta[name="_csrf_header"]').content;
// fetch('/api/transfer', {
//   method: 'POST',
//   headers: { [header]: token, 'Content-Type': 'application/json' },
//   body: JSON.stringify({ amount: 100 })
// });
