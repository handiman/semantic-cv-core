# Semantic‑CV Core

<img src="https://assets.semantic.cv/semantikitten-coding.png" alt="Coding Semantikitten" height="100" align="right" style="margin-left: 20px;" />

Semantic‑CV Core contains the **shared logic** used by both the Semantic‑CV CLI and the upcoming site at [semantic.cv][semantic-cv]. It provides the foundational processing pipeline that turns raw CV data into clean, deterministic output.

## What the core package provides

- **Normalization** of schema.org/Person data into a consistent internal shape
- **Analysis utilities** for enriching and structuring CV content
- **Rendering primitives** used by both the CLI and the hosted renderer

These modules form the backbone of the Semantic‑CV ecosystem. Everything else—CLI commands, themes, hosted rendering—builds on top of this package.

## What this repo does not include

- CLI commands or user‑facing tooling
- Theme definitions (see [`semantic-cv-themes`][semantic-cv-themes])
- The hosted site or its deployment configuration

## License

The core logic is free to use and integrate into your own workflows.

[semantic-cv]: https://semantic.cv
[semantic-cv-themes]: https://github.com/handiman/semantic-cv-themes
