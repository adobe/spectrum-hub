<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror.

     deps/rsp/data/CoachMark.json documents `triggerRef` explicitly
     (inheritedFrom PopoverProps) — the published CoachMark.d.ts confirms
     CoachMark's own props extend react-aria-components' PopoverProps
     directly (minus `children`/a few others), i.e. it's anchored to a
     target element via that same ref, normally supplied automatically by a
     CoachMarkTrigger wrapper (also defined alongside it in the same file).
     `children` is required per both the JSON and the .d.ts, so real body
     text is used here rather than a placeholder.

     CORRECTION, confirmed via a live browser reproduction: this actually
     fails for a different, more fundamental reason than the triggerRef
     story above — `@react-spectrum/s2` has no `CoachMark` export at all
     (esm.sh's bundle request 404s: "Failed to fetch dynamically imported
     module... exports=CoachMark,..."), the same broken-export category as
     icon.jsx/modal.jsx/popover-base.jsx. The triggerRef reasoning above may
     still describe CoachMark's real runtime behavior once you have a
     reference to it, but s2 consumers can't reach it under this name at
     all — this route can never render regardless of what this fragment
     contains. -->
<CoachMark>Click here to get started with your first project.</CoachMark>
