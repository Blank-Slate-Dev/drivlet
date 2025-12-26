// src/lib/validation.ts
// Input validation utilities for security

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password cannot exceed 128 characters" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'/`~]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }

  // Check against common passwords
  const commonPasswords = [
    "password",
    "12345678",
    "qwerty123",
    "password1",
    "123456789",
    "password123",
    "qwertyuiop",
    "letmein123",
  ];

  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some((p) => lowerPassword.includes(p))) {
    return { valid: false, error: "Password is too common. Please choose a stronger password." };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  // RFC 5322 compliant email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate Australian phone number
 */
export function validateAustralianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  // Accept various Australian formats
  return /^(\+?61|0)[2-478]\d{8}$/.test(cleanPhone);
}

/**
 * Validate ABN (Australian Business Number) - 11 digits
 */
export function validateABN(abn: string): boolean {
  if (!abn) return true; // Optional field
  const cleanABN = abn.replace(/\s/g, "");
  return /^\d{11}$/.test(cleanABN);
}

/**
 * Validate BSB - 6 digits
 */
export function validateBSB(bsb: string): boolean {
  if (!bsb) return false;
  const cleanBSB = bsb.replace(/[\s\-]/g, "");
  return /^\d{6}$/.test(cleanBSB);
}

/**
 * Validate Australian postcode - 4 digits
 */
export function validatePostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode);
}

/**
 * Sanitize string input - remove dangerous characters
 * Use for display purposes, NOT for database storage (use parameterized queries)
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (!input) return "";

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove HTML brackets
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Validate vehicle registration plate
 * Australian plates are typically 2-7 alphanumeric characters
 */
export function validateVehicleRegistration(rego: string): boolean {
  if (!rego) return false;
  const cleanRego = rego.trim().toUpperCase();
  return /^[A-Z0-9]{2,7}$/.test(cleanRego);
}

/**
 * Validate username
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Username cannot exceed 30 characters" };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores" };
  }

  return { valid: true };
}

/**
 * Validate CSRF by checking Origin/Referer header
 * Returns true if the request is from a trusted origin
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Get allowed origins from environment or use defaults
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    "https://drivlet.vercel.app",
    "https://www.drivlet.com.au",
    "https://drivlet.com.au",
  ].filter(Boolean);

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  // Check Origin header first (preferred)
  if (origin) {
    return allowedOrigins.some((allowed) => origin === allowed);
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return allowedOrigins.some((allowed) => refererOrigin === allowed);
    } catch {
      return false;
    }
  }

  // If neither Origin nor Referer is present, this could be:
  // - A same-origin request (browser doesn't send Origin for same-origin)
  // - A direct API call (curl, Postman, etc.)
  // For authenticated routes, we rely on session validation
  // For extra security on critical routes, return false to require Origin
  return false;
}

/**
 * Check CSRF and return error response if invalid
 * Use this for critical state-changing operations (payments, cancellations, etc.)
 */
export function requireValidOrigin(request: Request): { valid: true } | { valid: false; error: string } {
  if (!validateOrigin(request)) {
    // Log for security monitoring
    console.warn("CSRF validation failed", {
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      url: request.url,
    });
    return { valid: false, error: "Invalid request origin" };
  }
  return { valid: true };
}
