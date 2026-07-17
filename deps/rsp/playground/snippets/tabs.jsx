<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no
     preview markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. Mirrors
     deps/swc/playground/snippets/tabs.html's three-tab shape.

     aria-label is required here: @react-spectrum/s2's real Tabs throws "An
     aria-label or aria-labelledby prop is required on Tabs for
     accessibility" at render time otherwise — found via a live browser
     reproduction, not documented anywhere obvious. -->
<Tabs aria-label="Example tabs">
  <TabList>
    <Tab id="overview">Overview</Tab>
    <Tab id="details">Details</Tab>
    <Tab id="guidelines">Guidelines</Tab>
  </TabList>
  <TabPanel id="overview">Overview panel content.</TabPanel>
  <TabPanel id="details">Details panel content.</TabPanel>
  <TabPanel id="guidelines">Guidelines content goes here.</TabPanel>
</Tabs>
