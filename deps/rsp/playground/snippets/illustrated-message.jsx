<!-- Dev-authored fragment for code disclosure + live RSP preview (see divider.jsx).
     `illustration` marks Image as one of S2's illustration assets — a real usage
     imports it by path, e.g. `import Image from
     '@react-spectrum/s2/illustrations/gradient/generic1/Image'` — not the
     package's main `Image` export (see build-composite-element.js). Matches the
     real docs' rendered example (an inline illustration SVG, not a generic
     <img>) — a plain Image picks up IllustratedMessage's generic-photo frame
     styling instead, which looks different (see image.jsx for that case). -->
<IllustratedMessage>
  <Heading>Create your first asset.</Heading>
  <Content>Get started by uploading or importing some assets.</Content>
  <ButtonGroup>
    <Button variant="secondary">Import</Button>
    <Button variant="accent">Upload</Button>
  </ButtonGroup>
</IllustratedMessage>
