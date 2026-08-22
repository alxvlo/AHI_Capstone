---
paths:
  - "features/**"
  - "app/**"
  - "lib/dashboard/**"
---

# Error handling and redirects

- **Server actions:** validate first, then redirect with a `notice` or `error` query message.
  Never surface a raw exception to a user.
- **Return-path redirects must go through `lib/dashboard/return-path.ts` (`buildReturnPath`).**
  Do not hand-write `startsWith('/dashboard')` checks — the shared validator exists specifically to
  prevent prefix-spoofing attacks, and a local check will reintroduce the hole.
- **Client auth flows:** return structured `{ success, error }` objects for expected failures
  instead of throwing.
- Throw real `Error` objects only for missing configuration or genuinely impossible states.
- No silent `catch`. If a framework edge case forces one, keep it tiny and comment why.
- Log at boundaries where it helps debugging or auditability. No casual `console.log` in shipped code.
