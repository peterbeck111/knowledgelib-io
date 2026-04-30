// Input:  Any pointer that might be nil
// Output: The value, or a safe default

// Deref returns the pointed-to value, or zero value if nil
func Deref[T any](p *T) T {
    if p == nil {
        var zero T
        return zero
    }
    return *p
}

// DerefOr returns the pointed-to value, or fallback if nil
func DerefOr[T any](p *T, fallback T) T {
    if p == nil {
        return fallback
    }
    return *p
}

// Usage
func main() {
    var name *string
    fmt.Println(Deref(name))              // "" (zero value)
    fmt.Println(DerefOr(name, "unknown")) // "unknown"

    s := "Alice"
    name = &s
    fmt.Println(Deref(name))              // "Alice"
}
