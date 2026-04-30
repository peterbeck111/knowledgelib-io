// npm install oidc-client-ts@3
// Input:  OIDC provider configuration
// Output: Authenticated user with ID token claims

import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const userManager = new UserManager({
  authority: 'https://your-org.okta.com',  // Auto-discovers .well-known
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'https://your-app.example.com/auth/callback',
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: sessionStorage }), // NOT localStorage
});

// Initiate login
async function login(): Promise<void> {
  await userManager.signinRedirect();
}

// Handle callback (validates nonce, state, signature automatically)
async function handleCallback(): Promise<void> {
  const user = await userManager.signinRedirectCallback();
  console.log('Authenticated:', user.profile.sub, user.profile.email);
}

// Get current user
async function getUser() {
  const user = await userManager.getUser();
  if (user && !user.expired) return user;
  return null;
}
