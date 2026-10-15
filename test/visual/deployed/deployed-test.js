async function waitForImages(locator) {
  await locator.evaluate(async (root) => {
    const images = [...root.querySelectorAll('img')].filter((image) => {
      const bounds = image.getBoundingClientRect();
      return image.complete
        || image.naturalWidth > 0
        || bounds.width > 0
        || bounds.height > 0;
    });
    await Promise.all(images.map((image) => {
      if (image.complete) {
        return image.decode().catch(() => {});
      }
      if (image.naturalWidth > 0) {
        return undefined;
      }
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

export async function waitForStableCapture(locator) {
  await locator.page().evaluate(async () => document.fonts.ready);
  await waitForImages(locator);
}

export async function waitForStablePage(page) {
  await page.evaluate(async () => {
    const nextFrame = () => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    let previousSignature;
    let stable = false;
    for (let pass = 0; pass < 20; pass += 1) {
      for (
        let scrollPosition = 0;
        scrollPosition < document.documentElement.scrollHeight;
        scrollPosition += window.innerHeight
      ) {
        window.scrollTo(0, scrollPosition);
        await nextFrame();
      }

      const signature = `${document.documentElement.scrollHeight}:${document.images.length}`;
      if (signature === previousSignature) {
        stable = true;
        break;
      }
      previousSignature = signature;
    }
    if (!stable) {
      throw new Error('Page height and image count did not stabilize after scrolling.');
    }

    const renderedImages = [...document.images].filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.width > 0 || bounds.height > 0;
    });
    for (const image of renderedImages) {
      image.scrollIntoView({ block: 'center' });
      await nextFrame();
      if (!image.complete && image.naturalWidth === 0) {
        await new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }
    }

    window.scrollTo(0, 0);
    await nextFrame();
    await Promise.all(
      [...document.querySelectorAll('*')]
        .map((element) => element.updateComplete)
        .filter((updateComplete) => updateComplete?.then),
    );
    await nextFrame();
    await document.fonts.ready;
  });

  await waitForImages(page.locator('body'));
}
