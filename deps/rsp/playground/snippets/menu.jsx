<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror.

     deps/rsp/data/Menu.json marks `children` required but has no MenuItem
     entry of its own in this repo's catalog (no MenuItem.json exists) —
     the published Menu.d.ts confirms `MenuItem` is a real, separately
     exported @react-spectrum/s2 component (`function MenuItem(props:
     MenuItemProps): ReactNode`), matching the `MenuItemProps` interface
     already present in rsp-base-props.json. Real item children are
     authored below so the code disclosure panel shows genuine menu content.

     `aria-label` is included even though it isn't in Menu.json's extracted
     props: react-aria-components' AriaMenuProps supports it as an
     accessibility label, the same category of prop Tabs was found (live)
     to actually require at render time despite similarly not being marked
     required in its own extracted JSON — see tabs.jsx. Menu could not be
     independently re-verified for the same runtime requirement, since it
     never mounts in this harness regardless (see below), but it's included
     anyway as correct, real-world usage.

     CORRECTION, confirmed via a live browser reproduction: Menu does NOT
     hit the Tooltip/Dialog/Popover blank-preview limitation at all — unlike
     those, which only render inside the open/anchor state a Trigger
     provides, a standalone Menu renders its full item list directly and
     visibly (all three items above showed up exactly as authored). Menu
     apparently doesn't require MenuTrigger context to produce output, only
     to become a positioned popover — so this preview is a genuine, working
     one, not a limited/blank one. -->
<Menu aria-label="Example menu">
  <MenuItem id="rename">Rename</MenuItem>
  <MenuItem id="duplicate">Duplicate</MenuItem>
  <MenuItem id="delete">Delete</MenuItem>
</Menu>
