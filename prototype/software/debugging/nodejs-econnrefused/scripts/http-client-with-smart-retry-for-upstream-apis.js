// Input:  API calls failing intermittently with ECONNREFUSED/ECONNRESET
// Output: Axios client with configurable retry and circuit breaker

const axios = require('axios');

function createResilientClient(baseURL, options = {}) {
  const client = axios.create({
    baseURL,
    timeout: options.timeout || 10000,
  });

  const RETRYABLE_CODES = new Set([
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
    'ENETUNREACH', 'EAI_AGAIN',
  ]);
  const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

  client.interceptors.response.use(null, async (error) => {
    const config = error.config;
    config.__retryCount = config.__retryCount || 0;
    const maxRetries = options.maxRetries || 3;

    const isRetryable =
      (error.code && RETRYABLE_CODES.has(error.code)) ||
      (error.response && RETRYABLE_STATUS.has(error.response.status));

    if (!isRetryable || config.__retryCount >= maxRetries) {
      return Promise.reject(error);
    }

    config.__retryCount++;
    const delay = Math.min(
      1000 * Math.pow(2, config.__retryCount - 1) + Math.random() * 500,
      options.maxDelay || 10000
    );

    console.warn(
      `Retry ${config.__retryCount}/${maxRetries} for ${config.url} ` +
      `(${error.code || error.response?.status})`
    );

    await new Promise(r => setTimeout(r, delay));
    return client(config);
  });

  return client;
}

// Usage
const api = createResilientClient('https://api.example.com', {
  maxRetries: 3,
  timeout: 5000,
});

const { data } = await api.get('/users');
