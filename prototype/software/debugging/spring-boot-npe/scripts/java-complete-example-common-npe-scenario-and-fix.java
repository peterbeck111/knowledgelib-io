// SCENARIO: @Autowired field is null
// Input:  Controller with field injection, instantiated manually
// Output: NullPointerException at runtime

// ❌ BAD — the helper is created with "new", so Spring doesn't inject
@RestController
public class OrderController {
    @Autowired private OrderService orderService;

    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id) {
        OrderValidator validator = new OrderValidator();  // PROBLEM HERE
        validator.validate(id);  // NPE — validator.orderRepo is null
        return orderService.findById(id);
    }
}

public class OrderValidator {
    @Autowired private OrderRepository orderRepo;  // ALWAYS NULL

    public void validate(Long id) {
        orderRepo.existsById(id);  // NullPointerException!
    }
}

// ✅ GOOD — inject the validator as a bean
@Component  // Now Spring manages it
public class OrderValidator {
    private final OrderRepository orderRepo;

    public OrderValidator(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;  // Guaranteed non-null
    }

    public void validate(Long id) {
        if (!orderRepo.existsById(id)) {
            throw new IllegalArgumentException("Order not found: " + id);
        }
    }
}

@RestController
public class OrderController {
    private final OrderService orderService;
    private final OrderValidator validator;  // Injected by Spring

    public OrderController(OrderService orderService, OrderValidator validator) {
        this.orderService = orderService;
        this.validator = validator;
    }

    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id) {
        validator.validate(id);  // Works!
        return orderService.findById(id);
    }
}
