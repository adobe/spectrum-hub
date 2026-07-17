<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. deps/swc/playground/snippets/icon.html
     exists but is unrelated: it's the SWC `swc-icon` web component, a
     completely different implementation with its own working preview — not
     a shape to mirror here.

     KNOWN BROKEN EXPORT, confirmed via a live browser reproduction:
     @react-spectrum/s2 has no generic `Icon` export at all. Its own
     src/Icon.tsx only exports `createIcon`/`createIllustration` factory
     functions plus `IconContext`/`IllustrationContext` — real usage is one
     of the many individual pre-built icon glyph components those factories
     produce (separate named exports, not a shared `Icon` wrapper).
     Requesting `?component=icon&implementation=rsp` fails with "Failed to
     fetch dynamically imported module... exports=Icon" because esm.sh's
     tree-shaken import can't find that name in the package at all — this
     is not a fixable-by-fragment problem, initRsp() will always throw
     `No RSP export named "Icon"` (deps/rsp/playground/index.html) regardless of
     what this file contains. Authored anyway, per the one-file-per-JSON-
     entry convention, with real attributes from Icon.json's extracted
     props so the code disclosure panel is at least internally consistent. -->
<Icon aria-label="Icon" />
