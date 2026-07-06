# Implementation Plan- Component Playground

## Summary

Project: Spectrum Hub

Date: July 2026

Status: Planning

## Overview

The component playground surfaces live, interactive previews of Spectrum components alongside authored property controls. Authors define which component and implementation to render; the block fetches property data from a multi-tab AEM spreadsheet, builds a controls panel, and communicates prop changes to the component via postMessage.

> One implementation per page. Each page authors a single implementation value — swc, rsp, ios, or android. There is no dual-panel mode.

### Authored Block Shape

A metadata table block named `playground` with two rows:

| Key |	Value	| Notes |
| --- | --- | --- |
| implementation | swc / rsp / ios / android| Controls render mode |
| component |	e.g. button	| Lowercase, matches spreadsheet row |

### Spreadsheet Data Model

A two-tab AEM workbook drives all property and control configuration.

#### `components` tab

| Column| Description |
| --- | --- |
| component	| Component name (e.g. Button) |
| properties	| Comma-separated list of authored property names |
| notes	| Design / RSP / SWC naming discrepancies |

#### `controls` tab

| Column| Description |
| --- | --- |
| property | camelCase property name — join key between tabs |
| v1 | v1 control type (all picker) |
| v1+ | Future richer control (radio, switch, textfield, slider) |

> Picker options are resolved at runtime from deps/rsp/data/{Component}.json (RSP inline union types) and deps/swc/data/swc-{component}.json (SWC, named types only — RSP values are used as fallback).

### Architecture

#### 1 — Data utility scripts/utils/playground-data.js

- `fetchPlaygroundSheets(url)` — fetches `?sheet=components` and `?sheet=controls`
- `getComponentProperties(name, sheet)` — returns the comma-split property array
- `buildControlsMap(sheet)` — returns `Map<property, { v1, v1plus }>`
- `parsePickerOptions(typeString)` — splits RSP union string into value array
- `resolvePickerOptions(property, rspProps, swcProps)` — options from RSP, empty for SWC named types
- `resolveControl(property, implementation, controlsMap, rspProps, swcProps)` — returns descriptor or `null` (null = skip this control)

#### 2 — Sandbox block blocks/sandbox/

- Parses `implementation` and `component` from the metadata rows
- Fetches spreadsheet data + RSP and SWC JSON for the component
- For each authored property: calls `resolveControl()` — skips if null
- Renders a controls panel (v1: all pickers) + `<iframe>`
- On picker change -> `iframe.contentWindow.postMessage(...)`
- Maintains local `currentProps` state to power the code disclosure

#### 3 — Static HTML shell component-playground/index.html

Generic shell — reads `?component=button&implementation=swc` from the URL.

| Implementation | Render mode | How props apply |
| --- | --- | --- |
| swc | Custom element via CDN import | el.setAttribute(attribute, value) / el.textContent |
| rsp | React component via esm.sh (React confined to iframe) | Merge into props object, re-call root.render() |
| ios / android | Image viewer — no iframe | Picker change swaps displayed screenshot |

#### 4 — postMessage protocol

```js
// block -> iframe
{ type: 'prop-update', property: 'fillStyle', attribute: 'fill-style', value: 'outline' }
```

`property` = camelCase (RSP), `attribute` = kebab-case (SWC). Both are always sent. The shell uses whichever its implementation needs.

#### 5 — Code disclosure

A native `<details>/<summary>` below the iframe.

Content: a `<pre><code>` block showing current markup. Regenerated on every prop change in the block (no iframe involvement — the block owns state).

| Implementation | Snippet format |
| --- | --- |
| swn | `<swc-button variant="primary" size="M">Label</swc-button>` |
| rsn | `<Button variant="primary" size="M">Label</Button>` |
| ion | Swift snippet |
| android | Kotlin snippet |

### Property Filtering

If an authored property doesn't exist in the target implementation's JSON, `resolveControl()` returns null and no control is rendered. No fallback, no error — silently absent. This handles cases like SWC's `truncate` (no RSP equivalent) or RSP's `isPending` (no SWC equivalent by that name).

### Mobile Fallback (ios / android)

Native Swift and Kotlin components cannot render in a browser. When `implementation` is `ios` or `android`, the block renders an image viewer instead of an iframe. Picker changes swap the displayed screenshot by constructing a filename from the current prop state.

> Naming convention (v1): /component-playground/{component}/images/{implementation}/{prop1}-{val1}--{prop2}-{val2}.png, properties sorted alphabetically. A default.png serves as fallback when no exact match exists.

### Phased Delivery

#### V1

**Foundation**
- Data utility + node tests
- Sandbox block
- HTML shells (SWC only)
- All-picker controls
- Code disclosure
- RSP rendering in iframe via esm.sh
- React confined to iframe
- JSX code snippet
- Image viewer stub (ios/android)

#### V2+

**Richer Controls**
- Radio, switch, textfield, slider per v1+ column
- Image viewer asset workflow
- Swift / Kotlin snippets

### Files Created So Far

| File | Status |
| --- | --- |
| scripts/utils/playground-data.js | Done |
| test/extractions/playground-data.node.test.js | Needs cp from scratchpad |
| component-playground/index.html | In progress — CDN import TBD |
| blocks/sandbox/ | Not started |
