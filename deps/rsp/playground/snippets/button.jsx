<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component;
     the generic fallback (`{ children: 'Button' }`) already matches this
     exactly, so this fragment exists only for consistency with every other
     component having an authored default, matching deps/swc/playground/snippets/button.html. -->
<Button>Button</Button>
