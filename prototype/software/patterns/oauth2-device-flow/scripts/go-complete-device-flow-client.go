// Input:  clientID, scopes, IdP endpoints
// Output: TokenResponse with AccessToken, RefreshToken

package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "strings"
    "time"
)

type DeviceCodeResponse struct {
    DeviceCode              string `json:"device_code"`
    UserCode                string `json:"user_code"`
    VerificationURI         string `json:"verification_uri"`
    VerificationURIComplete string `json:"verification_uri_complete"`
    ExpiresIn               int    `json:"expires_in"`
    Interval                int    `json:"interval"`
}

type TokenResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    TokenType    string `json:"token_type"`
    ExpiresIn    int    `json:"expires_in"`
    Error        string `json:"error"`
    ErrorDesc    string `json:"error_description"`
}

func DeviceFlowAuth(clientID, deviceCodeURL, tokenURL, scope string) (*TokenResponse, error) {
    // Step 1: Request device code
    resp, err := http.PostForm(deviceCodeURL, url.Values{
        "client_id": {clientID},
        "scope":     {scope},
    })
    if err != nil {
        return nil, fmt.Errorf("device code request failed: %w", err)
    }
    defer resp.Body.Close()

    var auth DeviceCodeResponse
    json.NewDecoder(resp.Body).Decode(&auth)

    // Step 2: Display instructions
    fmt.Printf("\nTo sign in, visit: %s\n", auth.VerificationURI)
    fmt.Printf("Enter code: %s\n\n", auth.UserCode)

    // Step 3: Poll for token
    interval := time.Duration(auth.Interval) * time.Second
    if interval == 0 {
        interval = 5 * time.Second
    }
    deadline := time.Now().Add(time.Duration(auth.ExpiresIn) * time.Second)

    for time.Now().Before(deadline) {
        time.Sleep(interval)

        tokenResp, err := http.PostForm(tokenURL, url.Values{
            "grant_type":  {"urn:ietf:params:oauth:grant-type:device_code"},
            "device_code": {auth.DeviceCode},
            "client_id":   {clientID},
        })
        if err != nil {
            interval *= 2 // exponential backoff on network error
            continue
        }
        defer tokenResp.Body.Close()

        var token TokenResponse
        json.NewDecoder(tokenResp.Body).Decode(&token)

        if tokenResp.StatusCode == 200 {
            return &token, nil
        }

        switch token.Error {
        case "authorization_pending":
            continue
        case "slow_down":
            interval += 5 * time.Second
        case "access_denied":
            return nil, fmt.Errorf("user denied authorization")
        case "expired_token":
            return nil, fmt.Errorf("device code expired")
        default:
            return nil, fmt.Errorf("%s: %s", token.Error, token.ErrorDesc)
        }
    }
    return nil, fmt.Errorf("device code expired before user authorized")
}
