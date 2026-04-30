// Input:  Unleash server URL, API token
// Output: Feature flag evaluation via managed service

const { initialize } = require('unleash-client');  // unleash-client@5.x

const unleash = initialize({
  url: 'https://unleash.example.com/api',
  appName: 'my-app',
  customHeaders: { Authorization: process.env.UNLEASH_API_KEY },
  refreshInterval: 15000,  // poll every 15s
});

unleash.on('ready', () => {
  // Simple boolean check
  if (unleash.isEnabled('new-checkout')) {
    showNewCheckout();
  }
  // With user context for percentage/targeting
  const context = {
    userId: user.id,
    properties: { plan: user.plan, country: user.country },
  };
  if (unleash.isEnabled('premium-feature', context)) {
    enablePremiumFeature();
  }
});

// Graceful shutdown -- flush metrics
process.on('SIGTERM', () => unleash.destroy());
