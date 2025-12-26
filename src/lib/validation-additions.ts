// ADD THESE TO YOUR EXISTING src/lib/validation.ts FILE
// =====================================================

/**
 * Sanitize HTML content - strips dangerous tags and attributes
 * For user-generated content like reviews
 */
export function sanitizeHtml(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== "string") return "";

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove dangerous tags
  const dangerousTags = ["script", "iframe", "object", "embed", "form", "input", "button"];
  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*/>|<${tag}[^>]*>`, "gi");
    sanitized = sanitized.replace(regex, "");
  });

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/data:/gi, "");

  // Trim and limit length
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
