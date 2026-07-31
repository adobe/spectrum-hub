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

     FIXED (2026-07-31): AlertDialog is Dialog's specialized sibling — same
     DialogProps-shaped overlay content, always meant to render inside a
     DialogTrigger + Modal pair for its open/anchor state; standalone it used
     to mount nothing (same class of issue as Dialog/Popover/Tooltip — see
     overlay-triggers.js for the general fix). initRsp() and buildRspSnippet()
     now wrap this fragment in a real `<DialogTrigger><Button>...</Button>
     <AlertDialog>...</AlertDialog></DialogTrigger>` per overlay-triggers.js's
     `alert-dialog` entry — confirmed live: clicking the trigger opens a real
     "Delete file?" modal with working Cancel/Delete buttons. -->
<AlertDialog title="Delete file?" primaryActionLabel="Delete" cancelLabel="Cancel">This action cannot be undone.</AlertDialog>
