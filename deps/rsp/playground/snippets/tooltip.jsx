<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. Mirrors
     deps/swc/playground/snippets/tooltip.html's text.

     FIXED (2026-07-31) — was the original KNOWN LIMITATION found via a live
     browser reproduction (referenced by every other overlay snippet's own
     comment): rendered standalone like every other leaf/composite in this
     shell, RSP's real Tooltip mounted nothing at all — no DOM, no error —
     because react-aria-components' Tooltip only renders inside the
     open/anchor state a TooltipTrigger provides, and this harness had no
     concept of a two-component (trigger + tooltip) preview. Fixed by adding
     `overlay-triggers.js`, a route -> {trigger, triggerLabel} map that both
     initRsp() (live preview) and buildRspSnippet() (code disclosure) consult:
     the fetched export gets wrapped as `<TooltipTrigger><Button>Hover me
     </Button><Tooltip>...</Tooltip></TooltipTrigger>` instead of mounted
     bare. This still fits the one-`component`-per-route model — the route
     still names exactly one fragment/export, the Trigger + Button are just
     extra wrapping applied around it, not a second fetched route. Confirmed
     live: hovering the "Hover me" button now shows a real "Helpful tip text"
     tooltip. Dialog/AlertDialog/CustomDialog/FullscreenDialog/Popover all had
     the identical root cause (see each one's own comment) and got the same
     fix via DialogTrigger instead of TooltipTrigger. -->
<Tooltip>Helpful tip text</Tooltip>
