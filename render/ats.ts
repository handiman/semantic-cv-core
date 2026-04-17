import pipe from "../pipe.js";
import normalize from "../normalize.js";

/**
 * Render an ATS‑friendly plain‑text résumé.
 *
 * This function streams a deterministic sequence of text fragments
 * describing the Person object in a machine‑readable format. It uses
 * the same normalization pipeline as the HTML renderer, but writes
 * directly to a WritableStream instead of producing markup.
 *
 * The output is intentionally minimal:
 *   - no HTML
 *   - no styling
 *   - no layout constructs
 *   - one field per line in a predictable order
 *
 * @param person Normalized schema.org/Person object.
 * @param writable WritableStream that receives the plain‑text output.
 * @param closeStream Whether to close the stream inside the method (for Node) or if the caller should do it (Worker)
 */
export async function renderATS(
  person: any,
  writable: WritableStream,
  closeStream: boolean = false
) {
  const writer = writable.getWriter();
  pipe(
    normalize,
    name(writer),
    jobTitle(writer),
    workLocation(writer),
    email(writer),
    telephone(writer),
    url(writer),
    sameAs(writer),
    description(writer),
    skills(writer),
    worksFor(writer),
    alumniOf(writer),
    knowsLanguage(writer),
    hasCertification(writer),
    projects(writer)
  )(person);
  if (closeStream) {
    writer.close();
  }
}

export default renderATS;

const initCaps = (s: string) => {
  if (s.length) {
    return `${s[0].toUpperCase()}${s.substring(1)}`;
  }
  return s;
};

const toHost = (url: string) => {
  const host = url.substring(url.indexOf("://") + 3).replace("www.", "");
  return host.split(".")[0];
};

const name = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { name } = person;
  writer.write(name ? `${name}\n` : "");
  return person;
};

const jobTitle = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { jobTitle } = person;
  writer.write(jobTitle ? `${jobTitle}\n` : "");
  return person;
};

const workLocation = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { workLocation } = person;
  writer.write(workLocation ? `${workLocation}\n` : "");
  return person;
};

const email = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { email } = person;
  writer.write(email ? `Email: ${email}\n` : "");
  return person;
};

const telephone = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { telephone } = person;
  writer.write(telephone ? `Phone: ${telephone}\n` : "");
  return person;
};

const url = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { url } = person;
  writer.write(url ? `URL: ${url}\n` : "");
  return person;
};

const sameAs = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { sameAs } = person;
  (sameAs ?? []).map((url: string) => writer.write(`${initCaps(toHost(url))}: ${url}\n`));
  return person;
};

const description = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { description } = person;
  if (description) {
    writer.write(`\nSummary\n${description}\n`);
  }
  return person;
};

const skills = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { skills, knowsAbout } = person;
  if ((skills && skills.length > 0) || (knowsAbout && knowsAbout.length > 0)) {
    writer.write(`\nSkills\n${[...skills, knowsAbout].sort().join(", ")}\n`);
  }
  return person;
};

const role = (writer: WritableStreamDefaultWriter) => (role: any) => {
  if (role !== undefined) {
    const { roleName, startDate, endDate, description } = role;
    const { worksFor, alumniOf } = role;
    const { name, location } = worksFor ?? alumniOf ?? {};
    writer.write(`${name ?? ""}${location ? `, ${location}` : ""}\n`);
    if (roleName || startDate || endDate) {
      writer.write(
        `${[roleName, startDate, endDate].filter((item) => item !== undefined).join(" - ")}\n`
      );
    }
    if (description) {
      const lines = description.indexOf("\n") > -1 ? description.split("\n") : [description];
      for (const line of lines) {
        const bullet = line.startsWith("-") ? "" : "- ";
        writer.write(`${bullet} ${line}`);
      }
    }
    writer.write("\n\n");
  }
  return role;
};

const worksFor = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { worksFor } = person;
  const filtered = (worksFor ?? []).filter(
    (item: any) => item.worksFor["@type"] === "Organization"
  );

  if (filtered.length > 0) {
    writer.write(`\nProfessional Experience\n`);
    filtered.map(pipe(role(writer)));
  }

  return person;
};

const alumniOf = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { alumniOf } = person;
  if (alumniOf && alumniOf.length > 0) {
    writer.write(`\nEducation\n`);
    alumniOf.map(pipe(role(writer)));
  }

  return person;
};

const projects = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { worksFor } = person;
  const filtered = (worksFor ?? []).filter((item: any) => item.worksFor["@type"] === "Project");

  if (filtered.length > 0) {
    writer.write(`\nProjects\n`);
    filtered.map(pipe(role(writer)));
  }

  return person;
};

const knowsLanguage = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { knowsLanguage } = person;
  if (knowsLanguage && knowsLanguage.length > 0) {
    writer.write(`\nLanguages\n`);
    writer.write(knowsLanguage.map((language: string) => `- ${language}`).join("\n"));
  }
  return person;
};

const hasCertification = (writer: WritableStreamDefaultWriter) => (person: any) => {
  const { hasCertification } = person;
  if (hasCertification && hasCertification.length > 0) {
    writer.write(`\Certifications\n`);
    writer.write(hasCertification.map((cert: any) => cert.name).join("\n"));
  }
  return person;
};
