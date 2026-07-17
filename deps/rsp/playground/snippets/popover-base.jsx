<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror.

     deps/rsp/data/PopoverBase.json documents `triggerRef` explicitly (unlike
     Popover.json, where it only shows up via the published .d.ts) — "only
     required when used standalone", and this is exactly PopoverBase's
     unstyled/standalone-oriented sibling of Popover. `children` isn't
     listed in this repo's extracted props at all (the merge config doesn't
     pull react-aria-components' RenderProps-based children through for this
     one), but the published Popover.d.ts confirms PopoverBase's real props
     type still supports ReactNode/render-prop children underneath — a plain
     text child is used here, same minimal shape as popover.jsx.

     CORRECTION, confirmed via a live browser reproduction: this actually
     fails for a different, more fundamental reason than the triggerRef
     story above — `@react-spectrum/s2` has no `PopoverBase` export at all
     (esm.sh's bundle request 404s: "Failed to fetch dynamically imported
     module... exports=PopoverBase,..."), the same broken-export category as
     icon.jsx/modal.jsx (Icon/Modal aren't real top-level s2 exports either).
     The triggerRef reasoning above may still be accurate for what happens
     once you have a real reference to this component, but s2 consumers
     can't reach it under this name at all — this route can never render
     regardless of what this fragment contains. -->
<PopoverBase>Popover content goes here.</PopoverBase>
