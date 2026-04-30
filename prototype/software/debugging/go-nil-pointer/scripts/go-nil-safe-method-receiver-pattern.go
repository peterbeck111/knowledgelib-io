// Input:  A struct with methods that may be called on nil receivers
// Output: Methods that return zero values instead of panicking

type Config struct {
    Host string
    Port int
}

// Nil-safe getter — safe to call on nil receiver
func (c *Config) GetHost() string {
    if c == nil {
        return "localhost" // Sensible default
    }
    return c.Host
}

func (c *Config) GetPort() int {
    if c == nil {
        return 8080
    }
    return c.Port
}

// Usage: works even when config is nil
func startServer(cfg *Config) {
    host := cfg.GetHost() // Safe — returns "localhost" if cfg is nil
    port := cfg.GetPort() // Safe — returns 8080 if cfg is nil
    fmt.Printf("Listening on %s:%d\n", host, port)
}
