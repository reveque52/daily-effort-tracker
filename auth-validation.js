(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AuthValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MIN_PASSWORD_LENGTH = 8;

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate({ mode = "signin", email = "", password = "", confirmation = "" } = {}) {
    const normalizedMode = mode === "signup" ? "signup" : "signin";
    const normalizedEmail = normalizeEmail(email);
    const rawPassword = String(password || "");
    const rawConfirmation = String(confirmation || "");
    const errors = {};

    if (!isEmail(normalizedEmail)) errors.email = "Geçerli bir e-posta adresi yazın.";
    if (rawPassword.length < MIN_PASSWORD_LENGTH) errors.password = `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`;

    if (normalizedMode === "signup") {
      if (rawPassword !== rawPassword.trim()) errors.spaces = "Şifrenin başında veya sonunda boşluk bulunamaz.";
      if (rawPassword !== rawConfirmation) errors.confirmation = "Şifreler birbiriyle aynı olmalıdır.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      mode: normalizedMode,
      email: normalizedEmail,
      password: rawPassword,
      confirmation: rawConfirmation,
      errors,
      rules: {
        length: rawPassword.length >= MIN_PASSWORD_LENGTH,
        match: Boolean(rawConfirmation) && rawPassword === rawConfirmation,
        spaces: Boolean(rawPassword) && rawPassword === rawPassword.trim()
      }
    };
  }

  return Object.freeze({ MIN_PASSWORD_LENGTH, normalizeEmail, validate });
});
