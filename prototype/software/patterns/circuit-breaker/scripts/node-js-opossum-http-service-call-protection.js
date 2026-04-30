// Input:  HTTP endpoint that may fail
// Output: Response data or fallback value
const CircuitBreaker = require('opossum');  // ^8.1.3
const axios = require('axios');             // ^1.7.0

// The async function to protect
async function fetchUserProfile(userId) {
  const res = await axios.get(
    `https://api.users.example.com/v1/users/${userId}`,
    { timeout: 3000 }
  );
  return res.data;
}

// One breaker per downstream service
const breaker = new CircuitBreaker(fetchUserProfile, {
  timeout: 5000,                  // 5s max per call
  errorThresholdPercentage: 50,   // open at 50% failure rate
  resetTimeout: 30000,            // try again after 30s
  volumeThreshold: 5,             // min calls before tripping
  rollingCountTimeout: 10000,     // 10s sliding window
});

// Fallback: return cached/default data
breaker.fallback((userId) => ({
  id: userId, name: 'Unknown', cached: true
}));

// Monitoring hooks
breaker.on('open',    () => console.warn('[CB] Circuit OPENED'));
breaker.on('close',   () => console.info('[CB] Circuit CLOSED'));
breaker.on('halfOpen',() => console.info('[CB] Circuit HALF-OPEN'));
breaker.on('reject',  () => console.warn('[CB] Request REJECTED'));

// Usage
const profile = await breaker.fire('user-123');
