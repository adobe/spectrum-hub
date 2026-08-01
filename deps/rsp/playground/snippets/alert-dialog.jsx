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

     AlertDialog has no standalone open state, so initRsp()/buildRspSnippet()
     wrap it in a real DialogTrigger + Button (overlay-triggers.js). -->
<AlertDialog title="Delete file?" primaryActionLabel="Delete" cancelLabel="Cancel">This action cannot be undone.</AlertDialog>
