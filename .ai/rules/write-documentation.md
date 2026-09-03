---
description: Follow Adobe content writing standards when writing documentation for Spectrum Hub.
globs: "**/*.md"
alwaysApply: false
---

# Documentation standards

Follow and understand Adobe content writing standards when writing documentation for Spectrum Hub.

## When this rule applies

- Writing or updating documentation for this codebase
- Writing any documentation that is shipped to external consumers
- Creating documentation that is internal
- Drafting Jira tickets
- Writing a pull request description

## Example

### 🚨 Not following Adobe content standards

THE HERO BLOCK SUPPORTS TWO ROWS where the FIRST ROW is always the background (this can be a picture OR a video link!!!) and the second row is the foreground content which contains your text and headings and stuff, and you can also set a focal point on the background image by adding data-focal as an attribute with x% and y% values however be careful because if you don't set this correctly the image might not display properly on all screen sizes and you should always test on mobile AND desktop before publishing because otherwise it might look broken!!!

### ✅ Following Adobe content standards

The hero block supports two rows. The first row is the background — either a picture or a video link. The second row is the foreground content, which contains headings, text, and calls to action.

To set a focal point on the background image, add a `data-focal` attribute with `x%,y%` values (e.g. `data-focal:50%,30%`). This controls which part of the image stays visible when cropped on smaller screens.

## Format

Documentation is written in GitHub-Flavored Markdown. The point of this rule is the Adobe voice-and-tone standards, not Markdown syntax: match the register of the example above (plain, specific, calm — no shouting, no `!!!`, no run-on sentences) and follow the authoritative style guides in Resources below.

## Resources

- [Adobe voice and tone](https://spectrum.adobe.com/page/voice-and-tone/)
- [Grammar and mechanics](https://spectrum.adobe.com/page/grammar-and-mechanics/)
- [Inclusive UX writing](https://spectrum.adobe.com/page/inclusive-ux-writing/)
- [Writing about people](https://spectrum.adobe.com/page/writing-about-people/)
- [Writing for readability](https://spectrum.adobe.com/page/writing-for-readability/)
- [Writing with visuals](https://spectrum.adobe.com/page/writing-with-visuals/)
- [In-product word list](https://spectrum.adobe.com/page/in-product-word-list/)
- [Writing for errors](https://spectrum.adobe.com/page/writing-for-errors/)
