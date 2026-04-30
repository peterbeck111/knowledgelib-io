// Input:  Legacy jQuery AJAX calls scattered across codebase
// Output: Modern fetch wrapper with retry, timeout, and error handling

class ApiClient {
  constructor(baseUrl = '', defaultHeaders = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  async request(endpoint, options = {}, retries = 2) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    // Add timeout support (jQuery had this built-in, fetch does not)
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeout || 30000
    );
    config.signal = controller.signal;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        return await response.text();

      } catch (err) {
        clearTimeout(timeout);
        if (attempt === retries) throw err;
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  get(endpoint, options) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

// Usage — replaces all $.ajax / $.get / $.post / $.getJSON calls
const api = new ApiClient('/api/v1');
const users = await api.get('/users');
const created = await api.post('/users', { name: 'Alice' });
