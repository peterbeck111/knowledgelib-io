// Input:  HTTP request with user ID in context
// Output: 403 if Casbin denies, next handler if allowed

package main

import (
    "net/http"
    casbin "github.com/casbin/casbin/v2"
)

func AuthzMiddleware(e *casbin.Enforcer) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := r.Context().Value("userID").(string)
            obj := r.URL.Path       // resource
            act := r.Method         // action (GET, POST, DELETE)

            ok, err := e.Enforce(user, obj, act)
            if err != nil || !ok {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}

// Casbin model.conf:
// [request_definition]
// r = sub, obj, act
// [policy_definition]
// p = sub, obj, act
// [role_definition]
// g = _, _
// [matchers]
// m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
