<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     `children` is marked required in Link's own extracted prop data. `href`
     isn't in that JSON (Link's own LinkProps interface only adds
     variant/staticColor/isStandalone/isQuiet/children/styles on top of
     react-aria-components' base LinkProps, and this repo's extraction
     doesn't walk into that base interface) but is expected for a realistic
     default — without it this is just a styled anchor pointing nowhere.
     This is a leaf component with no hyphen in its name, so the generic
     fallback would already produce a valid "Link" label; this fragment
     exists mainly to give it real link text and an href instead of that
     placeholder. -->
<Link href="https://example.com">Learn more</Link>
