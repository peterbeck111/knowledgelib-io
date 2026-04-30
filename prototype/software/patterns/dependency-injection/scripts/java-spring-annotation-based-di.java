// Input:  Spring Boot application with @Service and @Repository
// Output: Auto-wired beans managed by Spring container

public interface UserRepository {
    Optional<User> findById(String id);
}

@Repository
public class JpaUserRepository implements UserRepository {
    @Override
    public Optional<User> findById(String id) {
        // JPA query
        return Optional.of(new User(id, "Alice"));
    }
}

@Service
public class UserService {
    private final UserRepository repo;  // final = immutable

    // Spring auto-injects via constructor (no @Autowired needed
    // when there is only one constructor, Spring 4.3+)
    public UserService(UserRepository repo) {
        this.repo = repo;
    }

    public Optional<User> getUser(String id) {
        return repo.findById(id);
    }
}
