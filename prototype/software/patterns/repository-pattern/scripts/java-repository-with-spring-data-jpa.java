// domain/repository/OrderRepository.java — domain interface
public interface OrderRepository {
    Optional<Order> findById(String id);
    List<Order> findByCustomerId(String customerId);
    void save(Order order);
    void delete(String id);
}

// infrastructure/persistence/JpaOrderRepository.java
@Repository
public class JpaOrderRepository implements OrderRepository {
    private final SpringDataOrderRepo springRepo;
    private final OrderMapper mapper;

    public JpaOrderRepository(SpringDataOrderRepo springRepo,
                               OrderMapper mapper) {
        this.springRepo = springRepo;
        this.mapper = mapper;
    }

    @Override
    public Optional<Order> findById(String id) {
        return springRepo.findById(id).map(mapper::toDomain);
    }

    @Override
    public void save(Order order) {
        springRepo.save(mapper.toEntity(order));
    }
}
