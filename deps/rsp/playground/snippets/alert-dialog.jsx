<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     deps/rsp/data/AlertDialog.json marks `title`, `primaryActionLabel`, and
     `children` as required (confirmed against the published
     AlertDialog.d.ts too, where they're plain non-optional fields, not just
     JSON-extraction quirks) — all three are set below. `cancelLabel` is
     optional but included for a realistic confirmation-style default;
     `variant` is left unset since 'confirmation' is already its default.

     BLANK-PREVIEW LIMITATION: AlertDialog is Dialog's specialized sibling —
     same DialogProps-shaped overlay content, always meant to render inside a
     DialogTrigger + Modal pair for its open/anchor state. Expected to have
     the same limitation confirmed live for Dialog, Menu, and Tooltip (see
     tooltip.jsx for the full mechanism writeup), but this specific component
     was not independently re-verified live — flag for a double-check. -->
<AlertDialog title="Delete file?" primaryActionLabel="Delete" cancelLabel="Cancel">This action cannot be undone.</AlertDialog>
