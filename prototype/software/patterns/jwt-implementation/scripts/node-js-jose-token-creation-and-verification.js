// Input:  User credentials (after authentication)
// Output: Signed JWT access token

// npm install jose@5
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";
import { readFileSync } from "fs";

const privateKey = await importPKCS8(
  readFileSync("private.pem", "utf-8"), "RS256"
);
const publicKey = await importSPKI(
  readFileSync("public.pem", "utf-8"), "RS256"
);

// Sign
const token = await new SignJWT({ sub: "user-123", roles: ["admin"] })
  .setProtectedHeader({ alg: "RS256", typ: "JWT" })
  .setIssuer("https://api.example.com")
  .setAudience("https://app.example.com")
  .setExpirationTime("15m")
  .setIssuedAt()
  .setNotBefore("0s")
  .setJti(crypto.randomUUID())
  .sign(privateKey);

// Verify (hard-coded algorithm)
const { payload } = await jwtVerify(token, publicKey, {
  algorithms: ["RS256"],
  issuer: "https://api.example.com",
  audience: "https://app.example.com",
  requiredClaims: ["exp", "sub", "iss", "aud"],
});
