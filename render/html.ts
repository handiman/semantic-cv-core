import analyzer from "../analyze.js";
const siteName = "Semantic CV";

/**
 * Render a complete Semantic‑CV HTML document.
 *
 * This function orchestrates the full rendering pipeline:
 *   1. Calls the active theme to produce its HTML, CSS, and JS fragments.
 *   2. Serializes the Person object as JSON‑LD.
 *   3. Runs the analyzer and embeds its results as an HTML comment.
 *   4. Injects OpenGraph and Twitter metadata.
 *   5. Uses the provided HTMLTransformer to rewrite a deterministic
 *      HTML skeleton, replacing placeholder nodes with theme output.
 *
 * The result is a fully‑assembled, self‑contained HTML document that
 * includes:
 *   - theme HTML injected into <body>
 *   - theme CSS injected into <style>
 *   - theme JS injected into <script type="module">
 *   - JSON‑LD data embedded in <script type="application/ld+json">
 *   - OG/Twitter meta tags in <head>
 *   - a <semantic-cv-theme-{id}> enhancement element that receives the
 *     JSON‑LD payload at runtime
 *
 * @param options.person Normalized schema.org/Person object.
 * @param options.theme Concrete theme instance providing renderHTML,
 *                      renderCSS, and renderJS.
 * @param options.transformer HTML rewriting implementation (Cloudflare
 *                            Worker or WASM) used to inject fragments.
 *
 * @returns Promise resolving to a complete HTML document string.
 */
export async function renderHTML(options: {
  person: any;
  theme: Theme;
  transformer: HTMLTransformer;
}): Promise<string> {
  const { person, theme, transformer } = options;
  const themeHTML = await theme.renderHTML(person);
  const themeCSS = await theme.renderCSS(person);
  const themeJS = await theme.renderJS(person);
  const json = JSON.stringify(stripVocab(person), null, 0);
  const analysisResults = analyze(json);
  const { description } = person;

  transformer
    .on(`head`, {
      element(head: any) {
        head.append(
          `
          <meta name="description" content="${description ? description : ""}" />
          <meta name="generator" content="${siteName}" />
          <meta name="semanticcv:theme" content="${theme.id}" />
          ${og(person).join("\n")}
          ${twitter(person).join("\n")}
          `,
          html
        );
      }
    })
    .on(`head script[type="module"]`, {
      element(script: any) {
        script.replace(`<script type="module">${themeJS}</script>`, html);
      }
    })
    .on(`head script[type="application/ld+json"]`, {
      element(script: any) {
        script.before(`\n<!-- Analysis results: ${analysisResults} -->`, html);
        script.replace(`\n<script type="application/ld+json">${json}</script>`, html);
        script.after(
          `\n<script type="application/ld+json">${JSON.stringify({
            ["@context"]: "https://schema.org",
            ["@type"]: "CreativeWork",
            isBasedOn: {
              ["@type"]: "SoftwareApplication",
              name: siteName,
              description: "A developer friendly tool for expressing your CV as structured data.",
              url: "https://semantic.cv"
            }
          })}</script>`,
          html
        );
      }
    })
    .on(`head style`, {
      element(style: any) {
        style.replace(`<style type="text/css">${themeCSS}</style>`, html);
      }
    })
    .on(`title`, {
      element(title: any) {
        title.replace(`<title>${pagetitle(person)}</title>`, html);
      }
    })
    .on(`body`, {
      element(body: any) {
        body.append(
          `
            ${themeHTML}
            <semantic-cv-theme-${theme.id}></semantic-cv-theme-${theme.id}>
            <script>
              const jsonld = document.querySelector('script[type="application/ld+json"]').textContent;
              const theme = document.querySelector("semantic-cv-theme-${theme.id}");
              if (theme) {
                theme.person = jsonld;
              }
            </script>
          `,
          html
        );
        body.append(
          `<footer class="scv-footer">Rendered with <a href="https://semantic.cv">semantic.cv</a> — Theme: <a href="https://semantic.cv/preview?theme=${theme.id}">${theme.id}</a></footer>`,
          html
        );
      }
    });

  return await transformer.transform(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title></title>
  <script type="application/ld+json"></script>
  <script type="module"></script>
  <style type="text/css"></style>
</head>
<body>
</body>
</html>
`);
}

export default renderHTML;

const html = { html: true };

const pagetitle = (person: any) => {
  const { name, jobTitle } = person;
  return `${name ?? ""}${jobTitle ? ` - ${jobTitle}` : ""} - ${siteName}`;
};

const og = (person: any) => {
  const { name, description, url, image } = person;
  const meta = [
    `<meta property="og:title" content="${pagetitle(person)}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:type" content="website" />`
  ];

  if (url) {
    meta.push(`<meta property="og:url" content="${url}" />`);
  }
  if (image) {
    meta.push(`<meta property="og:image" content="${image}" />`);
    meta.push(`<meta property="og:image:alt" content="${name}" />`);
  }
  return meta;
};

const twitter = (person: any) => {
  const { name, description, url, image } = person;
  const meta = new Array<string>();
  if (image) {
    meta.push(`<meta name="twitter.card" content="summary_large_image" />`);
    meta.push(`<meta property="twitter:image" content="${image}" />`);
    meta.push(`<meta name="twitter:image:alt" content="${name}" />`);
  } else {
    meta.push(`<meta name="twitter.card" content="summary" />`);
  }
  if (url) {
    meta.push(`<meta property="twitter:url" content="${url}" />`);
  }
  meta.push(`<meta property="twitter:title" content="${pagetitle(person)}" />`);
  meta.push(`<meta property="twitter:description" content="${description}" />`);
  return meta;
};

const cleananalysisResults = (analysisResults: Record<string, any>) => {
  for (const [key, value] of Object.entries(analysisResults)) {
    if (0 === value.errors.length && 0 === value.warnings.length) {
      delete analysisResults[key];
      continue;
    }
    if (0 === value.errors.length) {
      delete value.errors;
    }
    if (0 === value.warnings.length) {
      delete value.warnings;
    }
  }

  if (0 === Object.keys(analysisResults).length) {
    return "✔ No structural issues";
  } else {
    return JSON.stringify(analysisResults, null, 2);
  }
};

const stripVocab = (person: any) => {
  const result = { ...person };
  delete result.theme;
  result["@context"] = "https://schema.org";
  return result;
};

const analyze = (json: string) => cleananalysisResults(analyzer(json));

type HTMLTransformer = {
  transform(html: string): Promise<string>;
  on(
    selector: string,
    hooks: {
      element: (el: any) => void;
    }
  ): HTMLTransformer;
};

type Theme = {
  id: string;
  renderHTML(person: any): Promise<string>;
  renderCSS(person: any): Promise<string>;
  renderJS(person: any): Promise<string>;
};
