<!-- Dev-authored fragment for code disclosure + live RSP preview (see divider.jsx).
     No `styles` prop on ButtonGroup — the style() macro can't be evaluated by
     the XML parsing this fragment goes through (see build-composite-element.js). -->
<Form>
  <TextField label="Name" placeholder="Enter your full name" />
  <TextField label="Email" type="email" placeholder="Enter your email" />
  <Checkbox>I agree to the terms</Checkbox>
  <ButtonGroup>
    <Button type="submit" variant="primary">Submit</Button>
    <Button type="reset" variant="secondary">Reset</Button>
  </ButtonGroup>
</Form>

