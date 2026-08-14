<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh three-tag default.

     aria-label is required here: like Tabs, react-aria's underlying TagGroup
     throws an accessible-name error at render time without an aria-label or
     aria-labelledby (the `description` prop is a visible caption, not an
     accessible name substitute).

     selectionMode="single" is required for individual tags to be clickable at
     all — RAC's underlying TagList defaults selectionMode to 'none', in which
     case tags are focusable but nothing happens on click/press (confirmed via
     a live reproduction: with no selectionMode, clicking never sets
     aria-selected on any tag; adding selectionMode="single" makes clicking a
     tag toggle aria-selected="true" immediately, no `id` needed on the child
     `Tag`s — RAC auto-derives keys). Same mechanism as tree-view.jsx's
     selectionMode fix. selectionMode isn't a playground control (not in this
     repo's extracted TagGroup prop data, same one-hop extends limitation as
     the LabelableProps gap), so it's hardcoded here.

     NOTE: this makes tags selectable, which is the prerequisite for
     `isEmphasized` to matter at all (it's documented as an emphasized style
     for the *selected* look) — but even with a tag genuinely selected
     (confirmed via aria-selected="true") and isEmphasized sent as a real
     boolean all the way through to createElement, no computed style
     (background/color/border/box-shadow/outline/padding, on the row or any
     descendant) differs at all between isEmphasized true/false in the current
     esm.sh-published @react-spectrum/s2 build. That looks like a real gap in
     the published build, not something fixable from this snippet — flagged
     for upstream confirmation, not chased further here. -->
<TagGroup aria-label="Categories" selectionMode="single">
  <Tag>Design</Tag>
  <Tag>Engineering</Tag>
  <Tag>Marketing</Tag>
</TagGroup>
