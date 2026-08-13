<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     SideNav is Tree-based (same react-aria-components Tree primitive as TreeView —
     confirmed via SideNav.d.ts fetched from unpkg, which extends RACTreeProps) —
     aria-label is required for the same reason tree-view.jsx/radio-group.jsx need
     one: react-aria throws an accessible-name error at render time without it.
     Each SideNavItem's `textValue` is required; SideNavItemContent wraps the row's
     own label, same role as TreeViewItemContent, distinct from any nested child
     SideNavItems. -->
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
