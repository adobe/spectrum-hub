<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. Mirrors
     deps/swc/playground/snippets/button-group.html's two-button shape. -->
<ButtonGroup>
  <Button variant="secondary">Cancel</Button>
  <Button variant="accent">Save</Button>
</ButtonGroup>
