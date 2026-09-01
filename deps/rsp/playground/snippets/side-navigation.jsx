<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     SideNav is Tree-based (extends RACTreeProps), so it needs the same
     required aria-label and per-item `textValue` as tree-view.jsx. -->
<SideNav aria-label="Site sections">
  <SideNavItem id="get-started" textValue="Get started">
    <SideNavItemContent>Get started</SideNavItemContent>
  </SideNavItem>
  <SideNavItem id="components" textValue="Components">
    <SideNavItemContent>Components</SideNavItemContent>
    <SideNavItem id="components-buttons" textValue="Buttons">
      <SideNavItemContent>Buttons</SideNavItemContent>
    </SideNavItem>
  </SideNavItem>
</SideNav>
