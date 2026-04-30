// Input:  JSON-decoded struct from HTTP request
// Output: nil (valid) or validator.ValidationErrors

package main

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10" // v10.x
)

type CreateUserRequest struct {
	Email string `json:"email" validate:"required,email,max=254"`
	Name  string `json:"name"  validate:"required,min=1,max=100"`
	Age   int    `json:"age"   validate:"required,gte=13,lte=150"`
	Role  string `json:"role"  validate:"required,oneof=admin user viewer"`
	Bio   string `json:"bio"   validate:"omitempty,max=500"`
}

var validate = validator.New()

func init() {
	validate.RegisterValidation("safename", func(fl validator.FieldLevel) bool {
		name := fl.Field().String()
		for _, r := range name {
			if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
				r == ' ' || r == '-' || r == '\'') {
				return false
			}
		}
		return true
	})
}

func ValidateUser(req *CreateUserRequest) error {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	return validate.Struct(req)
}
