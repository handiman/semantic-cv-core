import analyzer from "../analyze.js";

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
  const json = JSON.stringify(person, null, 0);
  const analysisResults = analyze(json);

  transformer
    .on(`head`, {
      element(head: any) {
        for (const meta of [...og(person), ...twitter(person)]) {
          head.prepend(`\n  ${meta}`, html);
        }
      }
    })
    .on(`head script[type="module"]`, {
      element(script: any) {
        script.replace(`<script type="module">${themeJS}</script>`, html);
      }
    })
    .on(`head script[type="application/ld+json"]`, {
      element(script: any) {
        script.before(`<!-- Analysis results: ${analysisResults} -->`, html);
        script.replace(`<script type="application/ld+json">${json}</script>`, html);
      }
    })
    .on(`head style`, {
      element(style: any) {
        style.replace(`<style type="text/css">${themeCSS}</style>`, html);
      }
    })
    .on(`title`, {
      element(title: any) {
        title.replace(`<title>${person.name} - Semantic CV</title>`, html);
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

const og = (person: any) => {
  const meta = [
    `<meta property="og:site_name" content="${person.name}" />`,
    `<meta property="og:type" content="website" />`
  ];
  if (person.url) {
    meta.push(`<meta property="og:url" content="${person.url}" />`);
  }
  if (person.image) {
    meta.push(`<meta property="og:image" content="${person.image}" />`);
    meta.push(`<meta property="og:image:alt" content="${person.name}" />`);
  }
  return meta;
};

const twitter = (person: any) => {
  const meta = new Array<string>();
  if (person.image) {
    meta.push(`<meta name="twitter.card" content="summary_large_image" />`);
    meta.push(`<meta property="twitter:image" content="${person.image}" />`);
    meta.push(`<meta name="twitter:image:alt" content="${person.name}" />`);
  } else {
    meta.push(`<meta name="twitter.card" content="summary" />`);
  }
  meta.push(`<meta property="twitter:title" content="${person.name}" />`);
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

