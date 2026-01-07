## 2026-01-05 - React Prop Mutation & Memoization
**Learning:** `Array.prototype.sort()` sorts in-place. Using it directly on a prop array inside a component render function mutates the prop (and potentially parent state), which is a React anti-pattern and can cause subtle bugs.
**Action:** Always create a shallow copy before sorting (e.g., `[...props.items].sort(...)`) and wrap expensive sorting logic in `useMemo` to prevent unnecessary re-computations on every render.

## 2026-01-20 - SQLite N+1 Write Optimization
**Learning:** Performing multiple sequential `await db.run('UPDATE ...')` calls in a loop without an explicit transaction is extremely slow in SQLite because each call incurs separate fsync overhead.
**Action:** Wrap sequential database writes in `BEGIN TRANSACTION` and `COMMIT` to batch them into a single I/O operation. This reduced execution time by ~4.7x (2016ms -> 422ms) for 500 records.
