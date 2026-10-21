# Security Policy

## Supported versions

Only the latest commit on `master` receives security fixes. This repository is consumed by
[semantic-cv](https://github.com/handiman/semantic-cv) and [semantic.cv](https://semantic.cv), which pick up fixes
when they bump their pointer to it.

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability. Report it privately in one of these ways:

- Use GitHub's [private vulnerability reporting](https://github.com/handiman/semantic-cv-core/security/advisories/new).
- Email [security@semantic.cv](mailto:security@semantic.cv).

Include what you found, the steps to reproduce it and the version affected.

## What to expect

Semantic-CV is maintained by one person.

- I acknowledge your report within 7 days.
- I keep you updated while I investigate and aim to have a fix or a mitigation within 90 days.
- I disclose the vulnerability once a fix is released, and credit you if you wish.

## Scope

This policy covers:

- the `semantic-cv` CLI ([semantic-cv](https://github.com/handiman/semantic-cv))
- [semantic-cv-core](https://github.com/handiman/semantic-cv-core) and
  [semantic-cv-themes](https://github.com/handiman/semantic-cv-themes), which the CLI includes as submodules
- [semantic.cv](https://semantic.cv), the hosted service. Its source is not public, so report a vulnerability in it
  by email to [security@semantic.cv](mailto:security@semantic.cv).
