import normalize from "../normalize.js";

/**
 * Render an ATS‑friendly plain‑text résumé.
 *
 * The Person is normalized and formatted by `formatATS`, then written to
 * `writable` in one go. The returned Promise settles once the text has been
 * written (and the stream closed, when `closeStream` is set), so write
 * errors reach the caller instead of being lost.
 *
 * The output is intentionally minimal:
 *   - no HTML
 *   - no styling
 *   - no layout constructs
 *   - one field per line in a predictable order
 *
 * @param person schema.org/Person object (normalized here if it isn't already).
 * @param writable WritableStream that receives the plain‑text output.
 * @param closeStream Whether to close the stream inside the method (for Node) or if the caller should do it (Worker)
 */
export async function renderATS(
  person: any,
  writable: WritableStream,
  closeStream: boolean = false
) {
  const writer = writable.getWriter();
  try {
    await writer.write(formatATS(person));
    if (closeStream) {
      await writer.close();
    }
  } finally {
    writer.releaseLock();
  }
}

export default renderATS;

/**
 * Format a Person as ATS‑friendly plain text.
 *
 * Sections are separated by a blank line and only rendered when they have
 * content. Pure: no I/O, so it can be tested directly.
 */
export function formatATS(person: any): string {
  const normalized = normalize(person);
  const sections = [
    header(normalized),
    summary(normalized),
    skills(normalized),
    roles("Professional Experience", organizations(normalized)),
    roles("Education", normalized.alumniOf),
    list("Languages", normalized.knowsLanguage),
    list("Certifications", (normalized.hasCertification ?? []).map(certification)),
    roles("Projects", projects(normalized))
  ].filter((section) => section.length > 0);

  return plainText(sections.map((lines) => lines.join("\n")).join("\n\n") + "\n");
}

/**
 * Replace typographic hyphens and non-breaking spaces with their ASCII
 * counterparts, so keyword matching sees `full-time`, not `full‑time`.
 * En and em dashes are real punctuation and are kept.
 */
const plainText = (text: string) =>
  text.replace(/[\u2010\u2011\u2012]/g, "-").replace(/[\u00a0\u2007\u202f]/g, " ");

const initCaps = (s: string) => (s.length ? `${s[0].toUpperCase()}${s.substring(1)}` : s);

const toHost = (url: string) => {
  const host = url.substring(url.indexOf("://") + 3).replace("www.", "");
  return host.split(".")[0];
};

/** Brand spellings for common profile hosts; anything else is init-capped. */
const knownSites: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  linkedin: "LinkedIn",
  stackoverflow: "Stack Overflow",
  youtube: "YouTube"
};

const siteLabel = (url: string) => {
  const host = toHost(url);
  return knownSites[host.toLowerCase()] ?? initCaps(host);
};

const header = (person: any): Array<string> => {
  const { name, jobTitle, workLocation, email, telephone, url, sameAs } = person;
  return [
    name,
    jobTitle,
    workLocation,
    email ? `Email: ${email}` : undefined,
    telephone ? `Phone: ${telephone}` : undefined,
    url ? `URL: ${url}` : undefined,
    ...(sameAs ?? []).map((link: string) => `${siteLabel(link)}: ${link}`)
  ].filter(Boolean);
};

const summary = (person: any): Array<string> => {
  const description = String(person.description ?? "").trim();
  return description ? ["Summary", description] : [];
};

/**
 * Skills and knowsAbout merged into one sorted, de-duplicated line.
 */
const skills = (person: any): Array<string> => {
  const all = [...(person.skills ?? []), ...(person.knowsAbout ?? [])].filter(
    (item) => "string" === typeof item && item.trim().length > 0
  );
  const unique = [...new Set(all.map((item: string) => item.trim()))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  return unique.length ? ["Skills", unique.join(", ")] : [];
};

const list = (heading: string, items: Array<any> | undefined): Array<string> => {
  const values = (items ?? []).filter(Boolean);
  return values.length ? [heading, ...values.map((item) => `- ${item}`)] : [];
};

/**
 * "Name (Issuer, Year)", leaving out whichever parts are missing.
 */
const certification = (cert: any): string | undefined => {
  if (!cert?.name) {
    return undefined;
  }
  const issuer = typeof cert.issuedBy === "string" ? cert.issuedBy : cert.issuedBy?.name;
  const year = cert.validFrom ? String(cert.validFrom).substring(0, 4) : undefined;
  const details = [issuer, year].filter(Boolean);
  return details.length ? `${cert.name} (${details.join(", ")})` : cert.name;
};

const organizations = (person: any) =>
  (person.worksFor ?? []).filter((item: any) => item?.worksFor?.["@type"] === "Organization");

const projects = (person: any) =>
  (person.worksFor ?? []).filter((item: any) => item?.worksFor?.["@type"] === "Project");

const roles = (heading: string, items: Array<any> | undefined): Array<string> => {
  const blocks = (items ?? []).filter(Boolean).map(role);
  if (!blocks.length) {
    return [];
  }
  // A blank line between roles; the heading sits directly above the first.
  return [heading, ...blocks.flatMap((block, i) => (i > 0 ? ["", ...block] : block))];
};

const role = (item: any): Array<string> => {
  const { roleName, startDate, endDate, description } = item;
  const { name, location } = item.worksFor ?? item.alumniOf ?? {};
  const lines = [`${name ?? ""}${location ? `, ${location}` : ""}`];
  if (roleName) {
    lines.push(roleName);
  }
  // Dates get their own line, so the ISO dates' hyphens can't be confused
  // with a separator. A role with a start but no end is ongoing.
  if (startDate) {
    lines.push(`${startDate} – ${endDate ?? "Present"}`);
  } else if (endDate) {
    lines.push(endDate);
  }
  for (const line of String(description ?? "").split("\n")) {
    const text = line.trim();
    if (text) {
      lines.push(text.startsWith("-") ? text : `- ${text}`);
    }
  }
  return lines;
};
