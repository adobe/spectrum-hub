<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-branch default.

     aria-label is required here: like Tabs, react-aria's underlying TreeView
     throws an accessible-name error at render time without an aria-label or
     aria-labelledby. Each TreeViewItem's `textValue` and `children` are
     marked required in its extracted prop data; TreeViewItemContent wraps
     the row's own label, distinct from any nested child TreeViewItems. -->
<TreeView aria-label="File browser">
  <TreeViewItem id="assets" textValue="Assets">
    <TreeViewItemContent>Assets</TreeViewItemContent>
    <TreeViewItem id="logo" textValue="logo.svg">
      <TreeViewItemContent>logo.svg</TreeViewItemContent>
    </TreeViewItem>
  </TreeViewItem>
  <TreeViewItem id="docs" textValue="Docs">
    <TreeViewItemContent>Docs</TreeViewItemContent>
  </TreeViewItem>
</TreeView>
