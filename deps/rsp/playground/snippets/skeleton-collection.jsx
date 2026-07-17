<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror.

     GENUINELY UNSURE — flagging for live double-checking, in the same
     spirit as tooltip.jsx's/icon.jsx's honest-limitation notes, but this one
     is structurally worse than either:

     1. SkeletonCollection's own (and only) prop, `children`, is typed
        `() => ReactNode` — a render-prop FUNCTION, not renderable markup.
        Its own implementation (src/SkeletonCollection.tsx) calls
        `props.children()` directly. This fragment format has no way to
        author a function as children at all: buildCompositeElement
        (deps/rsp/playground/build-composite-element.js) only ever builds
        real element children or passes `node.textContent` (a string) as
        the sole child — never a callable. Whatever this file contains,
        initRsp() will hand SkeletonCollection either an array of elements
        or a plain string, and its internal `props.children()` call will
        throw at render time — not a silent no-op like Tooltip.
     2. Independent of (1), SkeletonCollection is built with react-aria's
        `createLeafComponent` — a collection-node primitive meant to be used
        only as a child of a Collection-based component (its own doc
        comment says it "generates placeholder content within a collection
        component such as CardView"), not mounted at the root of a preview
        on its own. Whether it renders anything standalone at all,
        independent of the children-function problem above, is untested
        here.

     Left as a childless leaf (no attributes needed — its own extracted prop
     data documents nothing but `children`) rather than inventing element
     children that would misrepresent the real `() => ReactNode` shape in
     the code disclosure panel. -->
<SkeletonCollection />
