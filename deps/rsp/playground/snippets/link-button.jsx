<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     `children` is marked required in LinkButton's own extracted prop data.
     `href` isn't in that JSON at all, but LinkButtonProps (src/Button.tsx)
     extends Link's own props (which do include `href`) minus a short
     omit-list that doesn't touch it — same undocumented-but-load-bearing
     situation as meter.jsx's `value`, just here it's needed to make this
     render as a real link instead of a plain button. Also fixes the label:
     the hyphenated component name would otherwise fall back to
     "Link-button". -->
<LinkButton href="https://example.com">Learn more</LinkButton>
