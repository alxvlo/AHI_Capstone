---
description: Full code review workflow — quality, security, performance, best practices
---

## /review Workflow

### Step 1: Read Context
- Read techstack.md and systempatterns.md
- Understand the module being reviewed

### Step 2: Review Dimensions
- ✅ Correctness: Does it do what it's supposed to?
- 🔒 Security: Any vulnerabilities, exposed secrets, injection risks?
- ⚡ Performance: Any unnecessary re-renders, N+1 queries, blocking ops?
- 📖 Readability: Is it understandable by another developer?
- 🧪 Testability: Is it testable? Are tests present?
- 📐 Conventions: Does it follow techstack.md and systempatterns.md?

### Step 3: Report
- Grade: [A / B / C / D / F]
- Issues found: [list with severity]
- Suggestions: [list with reasoning]

### Step 4: Fix (Optional)
- Ask: "Do you want me to apply the suggested fixes?"
