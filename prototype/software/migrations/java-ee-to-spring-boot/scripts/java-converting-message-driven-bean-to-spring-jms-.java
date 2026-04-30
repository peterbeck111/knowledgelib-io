// Input:  A Java EE MDB that processes JMS messages
// Output: Equivalent Spring Boot JMS listener

// === BEFORE: Java EE MDB ===
import javax.ejb.MessageDriven;
import javax.ejb.ActivationConfigProperty;
import javax.jms.Message;
import javax.jms.MessageListener;
import javax.jms.TextMessage;

@MessageDriven(activationConfig = {
    @ActivationConfigProperty(
        propertyName = "destinationType",
        propertyValue = "javax.jms.Queue"),
    @ActivationConfigProperty(
        propertyName = "destination",
        propertyValue = "jms/OrderQueue")
})
public class OrderProcessorMDB implements MessageListener {

    @EJB
    private OrderService orderService;

    @Override
    public void onMessage(Message message) {
        try {
            String orderJson = ((TextMessage) message).getText();
            OrderRequest request = parseOrder(orderJson);
            orderService.createOrder(request);
        } catch (Exception e) {
            // message redelivery handled by container
            throw new RuntimeException(e);
        }
    }
}

// === AFTER: Spring Boot JMS Listener ===
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

@Component
public class OrderProcessor {

    private final OrderService orderService;

    public OrderProcessor(OrderService orderService) {
        this.orderService = orderService;
    }

    @JmsListener(destination = "order-queue", concurrency = "3-10")
    public void processOrder(String orderJson) {
        OrderRequest request = parseOrder(orderJson);
        orderService.createOrder(request);
        // Retry/DLQ configured via Spring Boot properties
    }
}
