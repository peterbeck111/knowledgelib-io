// Input:  Java 17+, JDBC or JPA
// Output: Database-persisted state machine with transactional transitions

public enum OrderState {
    IDLE, PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED;

    private static final Map<OrderState, Map<String, OrderState>> TRANSITIONS = Map.of(
        IDLE,      Map.of("PLACE_ORDER", PENDING),
        PENDING,   Map.of("CONFIRM_PAYMENT", CONFIRMED, "CANCEL", CANCELLED),
        CONFIRMED, Map.of("SHIP", SHIPPED, "CANCEL", CANCELLED),
        SHIPPED,   Map.of("DELIVER", DELIVERED),
        DELIVERED, Map.of(),
        CANCELLED, Map.of()
    );

    public OrderState transition(String event) {
        Map<String, OrderState> allowed = TRANSITIONS.getOrDefault(this, Map.of());
        OrderState next = allowed.get(event);
        if (next == null) {
            throw new IllegalStateException(
                "Invalid transition: " + this + " + " + event
            );
        }
        return next;
    }
}

// In your service layer — wrap in a transaction
@Transactional
public Order processEvent(Long orderId, String event) {
    Order order = orderRepo.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order not found"));
    OrderState newState = order.getState().transition(event);
    order.setState(newState);
    order.setUpdatedAt(Instant.now());
    // Optimistic locking via @Version prevents concurrent transitions
    return orderRepo.save(order);
}
