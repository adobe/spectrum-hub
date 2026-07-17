<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No
     deps/swc/playground/snippets/text-field-base.html counterpart exists yet, so there's no SWC shape to
     mirror.

     UNCERTAIN: TextFieldBase.json's prop list is nearly identical to
     TextField.json's (size, prefix, isInvalid, styles, placeholder — the same
     four/five entries, word for word), which strongly suggests this is the
     internal shared base that TextField/TextArea/SearchField/NumberField
     compose their own field chrome from, rather than a component meant to be
     reached for directly in application code. It's included in this batch
     because it has its own top-level JSON file (implying it's a real,
     individually-documented @react-spectrum/s2 export), but whether
     `import {TextFieldBase} from '@react-spectrum/s2'` actually resolves to a
     usable standalone component — versus an internal-only export that
     happens to be documented — has NOT been confirmed live. Authored as a
     best-effort plain field with the same inherited `label` (from the shared
     `LabelableProps` interface in rsp-base-props.json, not in this
     component's own JSON either) as its siblings; please verify this actually
     renders before trusting it. -->
<TextFieldBase label="Text" />
