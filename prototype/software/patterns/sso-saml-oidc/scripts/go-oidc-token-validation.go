// go get github.com/coreos/go-oidc/v3@v3.11.0
// Input:  Raw ID token string from OIDC callback
// Output: Validated token claims

package main

import (
    "context"
    "fmt"
    "github.com/coreos/go-oidc/v3/oidc"
    "golang.org/x/oauth2"
)

func newOIDCVerifier(ctx context.Context, issuerURL, clientID string) (*oidc.IDTokenVerifier, *oauth2.Config, error) {
    provider, err := oidc.NewProvider(ctx, issuerURL)
    if err != nil {
        return nil, nil, fmt.Errorf("failed to discover OIDC provider: %w", err)
    }
    verifier := provider.Verifier(&oidc.Config{ClientID: clientID})
    config := &oauth2.Config{
        ClientID:     clientID,
        ClientSecret: "YOUR_CLIENT_SECRET",
        Endpoint:     provider.Endpoint(),
        RedirectURL:  "https://your-app.example.com/auth/callback",
        Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
    }
    return verifier, config, nil
}

func validateIDToken(ctx context.Context, verifier *oidc.IDTokenVerifier, rawToken string) error {
    idToken, err := verifier.Verify(ctx, rawToken)
    if err != nil {
        return fmt.Errorf("ID token verification failed: %w", err) // checks iss, aud, exp, sig
    }
    var claims struct {
        Email string `json:"email"`
        Name  string `json:"name"`
        Nonce string `json:"nonce"`
    }
    if err := idToken.Claims(&claims); err != nil {
        return fmt.Errorf("failed to parse claims: %w", err)
    }
    // CRITICAL: validate nonce matches what was sent in auth request
    // if claims.Nonce != expectedNonce { return errors.New("nonce mismatch") }
    fmt.Printf("User: %s (%s)\n", claims.Name, claims.Email)
    return nil
}
