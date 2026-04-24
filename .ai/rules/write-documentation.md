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

## Key patterns

Most often, documentation is written in Markdown format.

### Markdown syntax reference

#### Headers

```markdown
# H1 Header

## H2 Header

### H3 Header

#### H4 Header

##### H5 Header

###### H6 Header
```

#### Text Formatting

```markdown
**Bold text**

_Italic text_

**_Bold and italic_**

~~Strikethrough~~

`Inline code`

> Blockquote
> Multiple lines
> in blockquote

---

Horizontal rule (also \_\_\_ or \*\*\*)
```

#### Lists

```markdown
Unordered list:

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

Ordered list:

1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item

Task list (GitHub Flavored Markdown):

- [x] Completed task
- [ ] Incomplete task
- [ ] Another task
```

#### Links and Images

```markdown
[Link text](https://example.com)
[Link with title](https://example.com 'Link title')

Reference-style link:
[Link text][reference]
[reference]: https://example.com

Automatic link:
<https://example.com>
<email@example.com>

![Alt text](image.png)
![Alt text](image.png 'Image title')

Reference-style image:
![Alt text][image-ref]
[image-ref]: image.png
```

#### Code Blocks

````markdown
Inline code: `const x = 5;`

Code block with language:

```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
}
```

```bash
npm install
npm start
```
````

#### Tables

```markdown
Simple table:
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | Data     |
| Row 2    | Data     | Data     |

Aligned columns:
| Left | Center | Right |
|:-----|:------:|------:|
| Left | Center | Right |
| Text | Text   | Text  |
```

## Resources

- [Adobe voice and tone](https://spectrum.adobe.com/page/voice-and-tone/)
- [Grammar and mechanics](https://spectrum.adobe.com/page/grammar-and-mechanics/)
- [Inclusive UX writing](https://spectrum.adobe.com/page/inclusive-ux-writing/)
- [Writing about people](https://spectrum.adobe.com/page/writing-about-people/)
- [Writing for readability](https://spectrum.adobe.com/page/writing-for-readability/)
- [Writing with visuals](https://spectrum.adobe.com/page/writing-with-visuals/)
- [In-product word list](https://spectrum.adobe.com/page/in-product-word-list/)
- [Writing for errors](https://spectrum.adobe.com/page/writing-for-errors/)
