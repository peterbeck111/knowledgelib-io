package main

// Input:  multipart/form-data POST with "file" field
// Output: JSON { "id": "uuid.ext" } or error

import (
    "crypto/rand"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strings"
)

const (
    maxUploadSize = 10 << 20 // 10MB
    uploadDir     = "/var/uploads"
)

var allowedMIMEs = map[string]string{
    "image/jpeg":      ".jpg",
    "image/png":       ".png",
    "image/gif":       ".gif",
    "image/webp":      ".webp",
    "application/pdf": ".pdf",
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
    if err := r.ParseMultipartForm(maxUploadSize); err != nil {
        http.Error(w, "File too large", http.StatusRequestEntityTooLarge)
        return
    }
    file, header, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "Invalid file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    // Read first 512 bytes for content detection
    buf := make([]byte, 512)
    n, _ := file.Read(buf)
    mime := http.DetectContentType(buf[:n])
    ext, ok := allowedMIMEs[mime]
    if !ok {
        http.Error(w, fmt.Sprintf("Type %s not allowed", mime), http.StatusBadRequest)
        return
    }
    file.Seek(0, io.SeekStart) // Reset reader

    // Ignore user filename entirely -- generate UUID
    _ = header.Filename
    randBytes := make([]byte, 16)
    rand.Read(randBytes)
    safeName := hex.EncodeToString(randBytes) + ext
    destPath := filepath.Join(uploadDir, safeName)

    dst, err := os.Create(destPath)
    if err != nil {
        http.Error(w, "Storage error", http.StatusInternalServerError)
        return
    }
    defer dst.Close()
    if _, err := io.Copy(dst, file); err != nil {
        http.Error(w, "Write error", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"id": safeName})
}
