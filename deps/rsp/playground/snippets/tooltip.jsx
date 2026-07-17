<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. Mirrors
     deps/swc/playground/snippets/tooltip.html's text, but KNOWN LIMITATION found via a live
     browser reproduction: rendered standalone like every other leaf/composite
     in this shell, RSP's real Tooltip mounts nothing at all — no DOM, no
     error — because react-aria-components' Tooltip only renders inside the
     open/anchor state a TooltipTrigger provides, and this harness has no
     concept of a two-component (trigger + tooltip) preview. Fixing this
     would need a structural change to initRsp() (the `component` URL param
     names the route AND the single RSP export it fetches — TooltipTrigger
     wrapping Tooltip doesn't fit that one-component-per-route model), so
     left as-is rather than faking a wrapper this harness can't actually use. -->
<Tooltip>Helpful tip text</Tooltip>
