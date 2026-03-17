# Disclaimer

## Experimental Software

**MarkupKit is experimental software in active development.** It is provided as-is, without warranty of any kind. Use at your own risk.

### What this means

- This package is in early development (v1.x). APIs may change between minor versions.
- Do not use in production environments without thorough testing.
- The authors make no guarantees about accuracy, reliability, or fitness for any purpose.
- No sensitive data should be processed through this tool without your own security review.

### DYOR — Do Your Own Research

Before using MarkupKit in any project:

- **Review the source code yourself.** The full source is available on GitHub.
- **Test in your environment.** Behavior may vary across browsers, frameworks, and configurations.
- **Evaluate security implications.** This tool reads DOM content from your page. Understand what that means for your use case.
- **Check compatibility.** Verify it works with your React version and build toolchain.
- **Read the license.** This software is MIT-licensed with no warranty.

### Data Handling

- MarkupKit runs entirely in the browser. No data is sent to external servers by default.
- All DOM scanning and analysis happens client-side.
- If you use the `endpoint` prop (MarkupKit only), data is sent to the URL you specify — you are responsible for that endpoint's security.
- No analytics, telemetry, or tracking of any kind is included.

### Not Legal, Medical, or Professional Advice

Accessibility checks, contrast ratios, and other analysis provided by MarkupKit are informational only. They do not constitute compliance certification. Always consult qualified professionals for WCAG compliance, accessibility audits, and legal requirements.

### Limitation of Liability

To the maximum extent permitted by applicable law, the authors and contributors shall not be liable for any direct, indirect, incidental, special, exemplary, or consequential damages arising from the use of this software.
