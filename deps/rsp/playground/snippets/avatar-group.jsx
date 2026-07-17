<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No
     deps/swc/playground/snippets/*.html counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-avatar default.

     Reuses deps/swc/playground/snippets/avatar.html's inline data-URI placeholder so the
     preview never depends on an external image host. -->
<AvatarGroup label="Team members">
  <Avatar alt="Team member A" src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2232%22%20fill%3D%22%238a8a8a%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2241%22%20font-size%3D%2224%22%20text-anchor%3D%22middle%22%20fill%3D%22%23fff%22%20font-family%3D%22sans-serif%22%3EA%3C%2Ftext%3E%3C%2Fsvg%3E" />
  <Avatar alt="Team member B" src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2232%22%20fill%3D%22%238a8a8a%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2241%22%20font-size%3D%2224%22%20text-anchor%3D%22middle%22%20fill%3D%22%23fff%22%20font-family%3D%22sans-serif%22%3EB%3C%2Ftext%3E%3C%2Fsvg%3E" />
</AvatarGroup>
