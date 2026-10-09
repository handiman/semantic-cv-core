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
    list(
      "Certifications",
      (normalized.hasCertification ?? []).map((cert: any) => cert?.name)
    ),
    roles("Projects", projects(normalized))
  ].filter((section) => section.length > 0);

  return sections.map((lines) => lines.join("\n")).join("\n\n") + "\n";
}

const initCaps = (s: string) => (s.length ? `${s[0].toUpperCase()}${s.substring(1)}` : s);

const toHost = (url: string) => {
  const host = url.substring(url.indexOf("://") + 3).replace("www.", "");
  return host.split(".")[0];
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
    ...(sameAs ?? []).map((link: string) => `${initCaps(toHost(link))}: ${link}`)
  ].filter(Boolean);
};

const summary = (person: any): Array<string> =>
  person.description ? ["Summary", person.description] : [];

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
  const details = [roleName, startDate, endDate].filter(Boolean);
  if (details.length) {
    lines.push(details.join(" - "));
  }
  for (const line of String(description ?? "").split("\n")) {
    const text = line.trim();
    if (text) {
      lines.push(text.startsWith("-") ? text : `- ${text}`);
    }
  }
  return lines;
};
