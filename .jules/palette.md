## 2024-02-18 - Improved Transaction Form Accessibility
**Learning:** Adding `role="radiogroup"` to custom button grids instantly makes them understandable to screen readers, but full keyboard navigation (arrow keys) requires more JS. `aria-checked` is a good first step.
**Action:** When creating custom selection components, always consider if they should be radio groups or toggle buttons.
