// Input:  A Java EE interceptor that logs method execution time
// Output: Equivalent Spring AOP aspect

// === BEFORE: Java EE Interceptor ===
import javax.interceptor.AroundInvoke;
import javax.interceptor.Interceptor;
import javax.interceptor.InvocationContext;

@Interceptor
public class PerformanceInterceptor {

    @AroundInvoke
    public Object measureTime(InvocationContext ctx) throws Exception {
        long start = System.currentTimeMillis();
        try {
            return ctx.proceed();
        } finally {
            long duration = System.currentTimeMillis() - start;
            System.out.println(ctx.getMethod().getName() + " took " + duration + "ms");
        }
    }
}

// === AFTER: Spring AOP Aspect ===
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class PerformanceAspect {

    @Around("execution(* com.myapp.service.*.*(..))")
    public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return joinPoint.proceed();
        } finally {
            long duration = System.currentTimeMillis() - start;
            log.info("{} took {}ms", joinPoint.getSignature().getName(), duration);
        }
    }
}
