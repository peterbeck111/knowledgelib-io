// Input:  clientId, scopes, IdP endpoints
// Output: { access_token, refresh_token, expires_in }

async function deviceFlowAuth(clientId, deviceCodeUrl, tokenUrl, scope = "openid profile") {
  // Step 1: Request device code
  const codeResp = await fetch(deviceCodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope }),
  });
  const auth = await codeResp.json();

  // Step 2: Display instructions
  console.log(`\nTo sign in, visit: ${auth.verification_uri}`);
  console.log(`Enter code: ${auth.user_code}\n`);

  // Step 3: Poll for token
  let interval = (auth.interval || 5) * 1000; // convert to ms
  const deadline = Date.now() + auth.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const tokenResp = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: auth.device_code,
        client_id: clientId,
      }),
    });
    const data = await tokenResp.json();

    if (tokenResp.ok) return data;

    switch (data.error) {
      case "authorization_pending": continue;
      case "slow_down":            interval += 5000; continue;
      case "access_denied":        throw new Error("User denied authorization");
      case "expired_token":        throw new Error("Device code expired");
      default:                     throw new Error(`${data.error}: ${data.error_description}`);
    }
  }
  throw new Error("Device code expired before user authorized");
}
