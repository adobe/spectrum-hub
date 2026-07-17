<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh three-tag default.

     aria-label is required here: like Tabs, react-aria's underlying TagGroup
     throws an accessible-name error at render time without an aria-label or
     aria-labelledby (the `description` prop is a visible caption, not an
     accessible name substitute). -->
<TagGroup aria-label="Categories">
  <Tag>Design</Tag>
  <Tag>Engineering</Tag>
  <Tag>Marketing</Tag>
</TagGroup>
