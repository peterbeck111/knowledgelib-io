// Input:  Spring Security authenticated principal
// Output: AccessDeniedException if permission missing

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    // Enables @PreAuthorize annotations
}

@RestController
@RequestMapping("/articles")
public class ArticleController {

    @GetMapping
    @PreAuthorize("hasAuthority('read:articles')")
    public List<Article> list() {
        return articleService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('write:articles')")
    public Article create(@RequestBody Article article) {
        return articleService.save(article);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('delete:articles')")
    public void delete(@PathVariable Long id) {
        articleService.delete(id);
    }
}
// Roles are loaded via UserDetailsService, which maps
// DB role_permissions to GrantedAuthority objects.
