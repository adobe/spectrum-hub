<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in static-html/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No static-html/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh three-crumb default. -->
<Breadcrumbs>
  <Breadcrumb>Home</Breadcrumb>
  <Breadcrumb>Products</Breadcrumb>
  <Breadcrumb>Details</Breadcrumb>
</Breadcrumbs>
