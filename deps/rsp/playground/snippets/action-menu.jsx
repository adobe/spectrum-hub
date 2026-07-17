<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh three-item default, matching ActionMenu's own
     stories (Cut/Copy/Paste MenuItems).

     Unlike Tooltip, ActionMenu doesn't need an external trigger ancestor —
     its own implementation (src/ActionMenu.tsx) already wraps an
     ActionButton + Menu in an internal MenuTrigger, and these MenuItem
     elements ARE its real `children` prop (Menu's `children`, per
     ActionMenuProps' `Pick<MenuProps<T>, 'children' | ...>`). So the
     trigger button renders fully live here. What's still real, expected
     behavior (not a bug): the Menu's popover content — these MenuItems —
     only mounts once the button is actually clicked open, the same
     open/anchor-state gating Tooltip documents, just internalized here
     instead of needing a second top-level component. No explicit
     `aria-label` is needed either: ActionMenu's own implementation already
     falls back to a localized "More actions" label when none is
     provided. -->
<ActionMenu>
  <MenuItem>Cut</MenuItem>
  <MenuItem>Copy</MenuItem>
  <MenuItem>Paste</MenuItem>
</ActionMenu>
