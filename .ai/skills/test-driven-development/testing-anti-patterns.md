# Testing Anti-Patterns

**Load this reference when:** writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

This project's unit tests run in a real browser via `@web/test-runner`: they mount a block element, call its `init(el)`, and assert on the resulting DOM (see `test/blocks/card.test.js`). Accessibility is covered separately by Playwright + axe under `test/a11y/`. The anti-patterns below apply to both.

## Overview

Tests must verify real behavior, not mock behavior. Mocks are a means to isolate, not the thing being tested. Following strict TDD prevents most of these — you write the assertion against real code and watch it fail before any mock exists.

**Core principle:** Test what the code does, not what the mocks do.

Three rules the rest of this file expands on:

1. Never assert on mock behavior — assert on what the code produces.
2. Never add test-only methods to production code.
3. Never mock without understanding the dependency you're replacing.

## Anti-Pattern 1: Testing Mock Behavior

Asserting that a stub rendered tells you the stub works, not that the block works.

```js
// ❌ BAD: asserting the mock is present
init(el);
expect(el.querySelector('[data-testid="nav-mock"]')).to.exist;

// ✅ GOOD: assert the real output of init()
init(el);
expect(el.querySelector('nav[aria-label="Main navigation"]')).to.exist;
```

Before asserting on any mocked element, ask: am I testing real behavior or just mock existence? If it's existence, delete the assertion or stop mocking that piece.

## Anti-Pattern 2: Test-Only Methods in Production

A method that only tests call is production surface pretending to be API — dangerous if ever called for real, and it violates YAGNI.

```js
// ❌ BAD: teardown() exists only so tests can clean up
class Widget {
  teardown() { this.controller?.abort(); /* ...cleanup */ }
}

// ✅ GOOD: cleanup lives in a test helper
// test/helpers/widget.js
export function cleanupWidget(widget) {
  widget.controller?.abort();
}
```

Before adding a method to a production class, ask: is this only used by tests? If yes, put it in a test helper instead.

## Anti-Pattern 3: Mocking Without Understanding

Over-mocking "to be safe" removes a side effect the test actually depended on, so the test passes (or fails) for the wrong reason.

```js
// ❌ BAD: mocking the fetch away also removes the data the block renders from
window.fetch = () => Promise.resolve(new Response('{}'));
await init(el);
expect(el.querySelectorAll('.card').length).to.equal(3); // nothing to render — fails mysteriously

// ✅ GOOD: mock at the network boundary, return realistic data
window.fetch = () =>
  Promise.resolve(new Response(JSON.stringify({ data: threeCards })));
await init(el);
expect(el.querySelectorAll('.card').length).to.equal(3);
```

Before mocking, ask what side effects the real thing has and whether the test depends on any of them. When unsure, run the test against the real implementation first and observe what it needs, then mock minimally at the lowest boundary (usually the network).

## Anti-Pattern 4: Incomplete Mocks

A partial mock only includes the fields you thought of; downstream code that reads an omitted field fails silently, and the test proves nothing about the real response.

```js
// ❌ BAD: missing fields the block reads later (e.g. item.path)
const data = [{ title: 'A' }, { title: 'B' }];

// ✅ GOOD: mirror the real query-index.json shape
const data = [
  { path: '/a', title: 'A', description: '…' },
  { path: '/b', title: 'B', description: '…' },
];
```

Mock the complete data structure as it exists in reality — for this project, match the real `query-index.json` / fragment shapes. If uncertain, include all documented fields. Keep reusable mock strings in `test/a11y/mocks.js`; keep one-off mocks inline in the spec.

## Anti-Pattern 5: Tests as an Afterthought

"Implementation complete, tests to follow" is not complete. Testing is part of implementation. Write the failing test first, implement to pass, refactor, then claim done.

## When Mocks Become Too Complex

Warning signs the design (not the test) is wrong:

- Mock setup longer than the test logic
- Mocking everything just to make the test pass
- Mocks missing methods the real component has
- Test breaks whenever the mock changes

When you hit these, ask whether you need the mock at all — a test against real components is often simpler than an elaborate stub.

## TDD Prevents These Anti-Patterns

1. **Write test first** → forces you to define what you're actually testing
2. **Watch it fail** → confirms the test exercises real behavior, not a mock
3. **Minimal implementation** → no test-only methods creep in
4. **Real dependencies** → you see what the test needs before mocking

If you're testing mock behavior, you skipped step 2 — you added mocks without first watching the test fail against real code.

## Quick Reference

| Anti-Pattern                    | Fix                                           |
| ------------------------------- | --------------------------------------------- |
| Assert on mock elements         | Test real output or don't mock it             |
| Test-only methods in production | Move to a test helper                         |
| Mock without understanding      | Understand dependencies first, mock minimally |
| Incomplete mocks                | Mirror the real data shape completely         |
| Tests as afterthought           | TDD — tests first                             |
| Over-complex mocks              | Prefer real components over elaborate stubs   |
