// Input:  A Java EE stateless EJB with JNDI, EntityManager, and CMT
// Output: Equivalent Spring Boot service with constructor injection

// === BEFORE: Java EE ===
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.annotation.Resource;
import javax.jms.ConnectionFactory;
import javax.jms.Queue;

@Stateless
public class PaymentServiceBean implements PaymentServiceRemote {

    @PersistenceContext(unitName = "myPU")
    private EntityManager em;

    @Resource(mappedName = "jms/PaymentQueue")
    private Queue paymentQueue;

    @Resource(mappedName = "jms/ConnectionFactory")
    private ConnectionFactory connectionFactory;

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public PaymentResult processPayment(PaymentRequest request) {
        Payment payment = new Payment(request);
        em.persist(payment);
        sendNotification(payment);
        return new PaymentResult(payment.getId(), "SUCCESS");
    }
}

// === AFTER: Spring Boot ===
import jakarta.transaction.Transactional;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepo;
    private final JmsTemplate jmsTemplate;

    // Constructor injection — no @Autowired needed (single constructor)
    public PaymentService(PaymentRepository paymentRepo, JmsTemplate jmsTemplate) {
        this.paymentRepo = paymentRepo;
        this.jmsTemplate = jmsTemplate;
    }

    @Transactional
    public PaymentResult processPayment(PaymentRequest request) {
        Payment payment = new Payment(request);
        paymentRepo.save(payment);
        jmsTemplate.convertAndSend("payment-queue", payment);
        return new PaymentResult(payment.getId(), "SUCCESS");
    }
}
