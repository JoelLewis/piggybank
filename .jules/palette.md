## 2024-05-23 - Accessible Icon Buttons
**Learning:** Icon-only buttons (like "Create" or "Edit") are common in modern UI but invisible to screen readers without explicit labeling.
**Action:** Always pair icon-only interactive elements with `aria-label` describing the action, not just the icon name. For dynamic lists (like transactions), include context in the label (e.g., "Edit transaction for Groceries") to help users distinguish between multiple "Edit" buttons.
