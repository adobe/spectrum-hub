<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror (there's also no SWC `popover` concept to compare a trigger
     handling against — SWC's overlay-adjacent controls, like tooltip's, are
     native `popover` attributes rather than a standalone component).

     deps/rsp/data/Popover.json's `children` isn't marked required, so a
     plain text child is used here (mirrors tooltip.jsx's own minimal
     content, since Popover has no documented heading/body sub-slots the way
     Dialog does).

     BLANK-PREVIEW LIMITATION, same underlying cause as Tooltip (confirmed
     live — see tooltip.jsx for the full mechanism writeup): the published
     Popover.d.ts shows its props are Pick'd from PopoverProps, which
     includes `triggerRef` — "only required when used standalone" per its
     own doc comment, and this harness renders it exactly that way, with no
     DialogTrigger/MenuTrigger/etc. around it to supply that ref
     automatically. Confirmed via a live browser reproduction: this route
     renders a completely blank page, no error — matching Tooltip exactly. -->
<Popover>Popover content goes here.</Popover>
