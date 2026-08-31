# Security and data handling

## Current release boundary

This release is a private demonstration workspace. Trial-balance parsing and deterministic analysis run in the browser. Workspace continuity uses local storage on the current device. Do not use the demonstration with live client data on a shared or unmanaged device.

The application does not request, persist, or send Anthropic, Gemini, OpenAI, or other model-provider API keys from the browser. A production AI connector must run server-side with scoped credentials, redaction, audit logging, and explicit data-retention policy.

## Production controls still required

- Tenant and engagement isolation.
- Role-based access control and named approvals.
- Encryption in transit and at rest.
- Append-only audit events and evidence hashes.
- Malware scanning, file-type validation, and retention controls.
- Server-side standards update workflow with approval and immutable release pins.
- Backups, recovery testing, observability, and incident response.

## Reporting a vulnerability

Open a private security advisory in the GitHub repository. Do not place client data, credentials, or exploitable proof-of-concept details in a public issue.
