// Input:  File path to read
// Output: File contents or wrapped error

package main

import (
    "errors"
    "fmt"
    "os"
)

var ErrConfigNotFound = errors.New("config file not found")

type ConfigError struct {
    Path string
    Err  error
}

func (e *ConfigError) Error() string {
    return fmt.Sprintf("config error for %s: %v", e.Path, e.Err)
}

func (e *ConfigError) Unwrap() error { return e.Err }

func ReadConfig(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        if errors.Is(err, os.ErrNotExist) {
            return nil, fmt.Errorf("%w: %s", ErrConfigNotFound, path)
        }
        return nil, &ConfigError{Path: path, Err: err}
    }
    return data, nil
}
