/**
 * Output encoding for rendering untrusted CV data into HTML.
 *
 * A cv.json is written by whoever owns it, and the rendered page is served
 * from a shared origin (semantic.cv). Every string from the CV must therefore
 * be treated as untrusted when it is written into HTML.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape a string for use as HTML text or inside a quoted attribute value.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/**
 * Keys whose values end up in href/src attributes. Their values must be
 * absolute URLs with a scheme we know is harmless.
 */
const URL_KEYS = new Set([
  "url",
  "sameAs",
  "image",
  "logo",
  "contentUrl",
  "thumbnailUrl",
  "mainEntityOfPage",
]);

const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/**
 * Returns the URL if it is relative or uses http(s), mailto or tel, otherwise
 * undefined. Blocks javascript:, data:, vbscript: and friends, including the
 * obfuscated variants browsers still accept (leading whitespace, tabs or
 * newlines inside the scheme, mixed case).
 */
export const safeUrl = (value: unknown): string | undefined => {
  if ("string" !== typeof value) {
    return undefined;
  }
  const url = value.trim();
  // Browsers ignore ASCII control characters and whitespace here.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.replace(/[\u0000-\u0020]/g, ""));
  if (!scheme) {
    return url; // relative URL, e.g. an image next to cv.json in the CLI
  }
  return SAFE_SCHEMES.has(scheme[1].toLowerCase()) ? url : undefined;
};

/**
 * Returns a deep copy of `data` that is safe to interpolate into HTML:
 *
 *   • every string is HTML-escaped (text and quoted-attribute safe)
 *   • values of URL-carrying keys (url, sameAs, image, …) that are not
 *     http(s)/mailto/tel URLs are removed
 *
 * Non-string scalars are kept as they are. Themes receive this copy, so they
 * must insert values as HTML (`{ html: true }`) and must not escape again.
 */
export const escapeForHtml = <T>(data: T): T => escapeValue(data, undefined) as T;

const escapeValue = (value: any, key: string | undefined): any => {
  if (Array.isArray(value)) {
    return value
      .map((item) => escapeValue(item, key))
      .filter((item) => item !== undefined);
  }
  if (value && "object" === typeof value) {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const escaped = escapeValue(v, k);
      if (escaped !== undefined) {
        result[k] = escaped;
      }
    }
    return result;
  }
  if ("string" === typeof value) {
    if (key && URL_KEYS.has(key)) {
      const url = safeUrl(value);
      return url === undefined ? undefined : escapeHtml(url);
    }
    return escapeHtml(value);
  }
  return value;
};

/**
 * Serialize data as JSON that can be embedded in a <script> element without
 * the content being able to close the element or open a comment.
 */
export const jsonForScript = (data: unknown): string =>
  JSON.stringify(data, null, 0)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/**
 * Make text safe to place inside an HTML comment.
 */
export const commentSafe = (text: string): string =>
  text.replace(/--/g, "- -").replace(/</g, "&lt;").replace(/>/g, "&gt;");
