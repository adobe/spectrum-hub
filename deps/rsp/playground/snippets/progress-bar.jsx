<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     This is a leaf component; `value` isn't in ProgressBar's own extracted
     prop data (inherited from react-aria-components' AriaProgressBarProps,
     which this repo's extraction doesn't walk into) but is required for the
     bar to show any fill at all — the same gotcha meter.jsx documents for
     `value`, since Meter and ProgressBar share that same base interface.
     Unlike Meter, `label` IS documented in ProgressBar's own JSON. -->
<ProgressBar value="60" label="Loading…" />
