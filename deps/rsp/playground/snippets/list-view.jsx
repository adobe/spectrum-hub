<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-item default, matching table-view.jsx/
     card-view.jsx's file shape.

     aria-label is required here: like TableView/CardView, ListView's own
     stories always pass one ('Files'), and its underlying GridList throws
     an accessible-name error at render time without an aria-label or
     aria-labelledby. Children are ListViewItem elements (a real top-level
     export alongside ListView, per src/ListView.tsx/exports/index.ts) — not
     bare text, per its own stories.

     Despite having the same `StylesPropWithHeight` styles type as CardView/
     TableView, this one was verified live and renders correctly at #mount's
     default size with no shell changes needed — its GridList apparently
     doesn't hit the same 0-height virtualizer chicken-and-egg problem, so it
     was deliberately left OUT of VIRTUALIZED_RSP_COMPONENTS in
     deps/rsp/playground/index.html. -->
<ListView aria-label="Files">
  <ListViewItem id="budget">Budget.xlsx</ListViewItem>
  <ListViewItem id="roadmap">Roadmap.pdf</ListViewItem>
</ListView>
