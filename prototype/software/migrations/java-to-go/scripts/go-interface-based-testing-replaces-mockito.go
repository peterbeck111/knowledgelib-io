// Input:  Java unit test with Mockito mocks
// Output: Go test using interface-based test doubles (no framework needed)

package service

import (
    "context"
    "errors"
    "testing"
)

// Mock repository (replaces @Mock + Mockito.when())
type mockUserRepo struct {
    users map[int64]*User
    err   error
}

func (m *mockUserRepo) FindByID(ctx context.Context, id int64) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    u, ok := m.users[id]
    if !ok {
        return nil, ErrNotFound
    }
    return u, nil
}

func TestGetUser_Success(t *testing.T) {
    repo := &mockUserRepo{
        users: map[int64]*User{
            1: {ID: 1, Name: "Alice"},
        },
    }
    svc := NewUserService(repo, nil)

    user, err := svc.GetUser(context.Background(), 1)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got name %q, want %q", user.Name, "Alice")
    }
}

func TestGetUser_NotFound(t *testing.T) {
    repo := &mockUserRepo{users: map[int64]*User{}}
    svc := NewUserService(repo, nil)

    _, err := svc.GetUser(context.Background(), 999)
    if !errors.Is(err, ErrNotFound) {
        t.Errorf("got error %v, want ErrNotFound", err)
    }
}

func TestGetUser_DBError(t *testing.T) {
    repo := &mockUserRepo{err: errors.New("connection refused")}
    svc := NewUserService(repo, nil)

    _, err := svc.GetUser(context.Background(), 1)
    if err == nil {
        t.Fatal("expected error, got nil")
    }
}
