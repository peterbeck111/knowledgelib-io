// gateway.js — Custom API gateway with Express
// Input:  HTTP requests on port 3000
// Output: Proxied requests to backend services with auth, rate limiting, logging

const express = require("express"); // ^4.21.0
const { createProxyMiddleware } = require("http-proxy-middleware"); // ^3.0.0
const rateLimit = require("express-rate-limit"); // ^7.5.0
const jwt = require("jsonwebtoken"); // ^9.0.0
const morgan = require("morgan"); // ^1.10.0

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Middleware: Logging ---
app.use(morgan("combined"));

// --- Middleware: Global rate limiter ---
const limiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute window
  max: 100,                // 100 requests per window per IP
  standardHeaders: true,   // Return RateLimit-* headers
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(limiter);

// --- Middleware: JWT authentication ---
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

// --- Health check (no auth) ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Service routes ---
const services = {
  "/api/v1/users": {
    target: process.env.USER_SERVICE_URL || "http://localhost:8001",
    changeOrigin: true,
  },
  "/api/v1/orders": {
    target: process.env.ORDER_SERVICE_URL || "http://localhost:8002",
    changeOrigin: true,
  },
  "/api/v1/payments": {
    target: process.env.PAYMENT_SERVICE_URL || "http://localhost:8003",
    changeOrigin: true,
  },
};

// Register proxy routes with authentication
for (const [path, config] of Object.entries(services)) {
  app.use(path, authenticate, createProxyMiddleware({
    target: config.target,
    changeOrigin: config.changeOrigin,
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward authenticated user info to backend
        if (req.user) {
          proxyReq.setHeader("X-User-ID", req.user.sub);
          proxyReq.setHeader("X-User-Role", req.user.role || "user");
        }
        proxyReq.setHeader("X-Request-ID", crypto.randomUUID());
      },
      error: (err, req, res) => {
        console.error(`Proxy error for ${req.path}:`, err.message);
        res.status(502).json({ error: "Service unavailable" });
      },
    },
  }));
}

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
