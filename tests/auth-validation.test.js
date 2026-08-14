"use strict";

const assert = require("node:assert/strict");
const AuthValidation = require("../auth-validation");

assert.equal(AuthValidation.MIN_PASSWORD_LENGTH, 8);

for (let length = 0; length < 8; length += 1) {
  const password = "a".repeat(length);
  const result = AuthValidation.validate({ mode: "signup", email: "user@example.com", password, confirmation: password });
  assert.equal(result.valid, false, `${length} karakterli şifre kayıt isteğine izin vermemeli`);
  assert.ok(result.errors.password);
}

assert.equal(AuthValidation.validate({ mode: "signup", email: "user@example.com", password: "12345678", confirmation: "12345678" }).valid, true);
assert.ok(AuthValidation.validate({ mode: "signup", email: "user@example.com", password: "12345678 ", confirmation: "12345678 " }).errors.spaces);
assert.ok(AuthValidation.validate({ mode: "signup", email: "user@example.com", password: "12345678", confirmation: "87654321" }).errors.confirmation);
assert.ok(AuthValidation.validate({ mode: "signup", email: "hatalı", password: "12345678", confirmation: "12345678" }).errors.email);
assert.equal(AuthValidation.validate({ mode: "signin", email: " USER@EXAMPLE.COM ", password: "12345678" }).email, "user@example.com");

console.log("✓ giriş ve kayıt doğrulaması kısa, boşluklu ve eşleşmeyen şifreleri engeller");
