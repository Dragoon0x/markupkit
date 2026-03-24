# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in MarkupKit, please report it responsibly:

1. **Do not** open a public issue.
2. Include steps to reproduce, impact assessment, and any suggested fixes.
4. We will acknowledge receipt within 48 hours and aim to resolve critical issues within 7 days.

## Scope

MarkupKit is a client-side development tool. Its security surface includes:

- DOM reading and analysis (runs in the user's browser)
- No server-side code is included in this package
- No external network requests are made by default
- No credentials, tokens, or secrets are stored or transmitted

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Current |
| < 1.0   | ❌ No      |

## Best Practices

- Only use MarkupKit in development environments (`NODE_ENV === "development"`)
- Do not ship MarkupKit to production bundles
- Review the source code if you have security concerns
- Keep the package updated to the latest version
