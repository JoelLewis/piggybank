## 2026-01-05 - React Prop Mutation & Memoization
**Learning:** `Array.prototype.sort()` sorts in-place. Using it directly on a prop array inside a component render function mutates the prop (and potentially parent state), which is a React anti-pattern and can cause subtle bugs.
**Action:** Always create a shallow copy before sorting (e.g., `[...props.items].sort(...)`) and wrap expensive sorting logic in `useMemo` to prevent unnecessary re-computations on every render.
