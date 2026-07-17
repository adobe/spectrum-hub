<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name — "Checkbox"
     (already fine standalone, but this still gives it real visible text).
     No deps/swc/playground/snippets/checkbox.html counterpart exists yet, so there's no SWC
     shape to mirror.

     This is a STANDALONE Checkbox, not one nested in a CheckboxGroup (see
     checkbox-group.jsx for that composite case). Checkbox.json documents
     `children` directly ("The label for the element"), so plain text content
     is used as the label, same as ActionButton — no `aria-label` needed.
     Unlike checkbox-group.jsx's Checkbox children, this one does NOT need a
     `value` prop: `value` is only meaningful for tracking which checkbox is
     selected within a CheckboxGroup's shared selection state, which doesn't
     apply here since there's no group. -->
<Checkbox>Accept terms</Checkbox>
