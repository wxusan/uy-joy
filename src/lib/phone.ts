export type PhoneNormalizationResult = {
  display: string;
  normalized: string | null;
  isValid: boolean;
  country: "UZ" | "unknown" | null;
};

const uzbekMobilePrefixes = new Set(["90", "91", "93", "94", "95", "97", "98", "99", "33", "55", "77", "88"]);

export function normalizePhone(value: string | null | undefined): PhoneNormalizationResult {
  const display = (value ?? "").trim().replace(/\s+/g, " ");
  const compact = display.replace(/[\s\-()]/g, "");

  if (!compact) {
    return { display, normalized: null, isValid: false, country: null };
  }

  const digits = compact.replace(/^\+/, "");

  if (/^998\d{9}$/.test(digits)) {
    return { display, normalized: `+${digits}`, isValid: true, country: "UZ" };
  }

  if (/^\d{9}$/.test(digits) && uzbekMobilePrefixes.has(digits.slice(0, 2))) {
    return { display, normalized: `+998${digits}`, isValid: true, country: "UZ" };
  }

  if (compact.startsWith("+") && /^\+\d{8,15}$/.test(compact)) {
    return { display, normalized: compact, isValid: true, country: compact.startsWith("+998") ? "UZ" : "unknown" };
  }

  return { display, normalized: null, isValid: false, country: null };
}
