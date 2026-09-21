import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(TEST_ROOT, '../a11y/fixtures');
const EXEMPT_FIXTURES = new Map([
  [
    'schedule.html',
    'The current block fails before it produces a deterministic schedule component because its loadFragment return-shape handling is defective.',
  ],
  [
    'section-metadata.html',
    'The block applies section configuration and removes its own root, leaving no visual component to capture.',
  ],
]);

async function inventoryHtmlFiles(directory, relativeDirectory = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const fixtures = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      return inventoryHtmlFiles(path.join(directory, entry.name), relativePath);
    }
    return entry.isFile() && path.extname(entry.name) === '.html'
      ? [relativePath.split(path.sep).join('/')]
      : [];
  }));

  return fixtures.flat().sort();
}

function expectedSpecPath(fixture) {
  const parsed = path.posix.parse(fixture);
  const specDirectory = parsed.dir || 'blocks';
  return path.posix.join('test/visual', specDirectory, `${parsed.name}.spec.js`);
}

function collectFixtureRoutes(source) {
  const routes = new Set();
  const collectRoutesRule = {
    create() {
      return {
        CallExpression(node) {
          if (node.optional || node.callee.type !== 'Identifier') {
            return;
          }

          let argumentIndex = -1;
          if (node.callee.name === 'defineVisualFixture') {
            argumentIndex = 0;
          } else if (node.callee.name === 'gotoFixture') {
            argumentIndex = 1;
          }
          const config = node.arguments[argumentIndex];
          if (config?.type !== 'ObjectExpression') {
            return;
          }

          const pathProperty = config.properties.find((property) => (
            property.type === 'Property'
            && !property.computed
            && (
              (property.key.type === 'Identifier' && property.key.name === 'path')
              || (property.key.type === 'Literal' && property.key.value === 'path')
            )
          ));
          if (pathProperty?.value.type === 'Literal' && typeof pathProperty.value.value === 'string') {
            routes.add(pathProperty.value.value);
          }
        },
      };
    },
  };
  const messages = new Linter().verify(source, [{
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      fixtureCoverage: {
        rules: {
          'collect-routes': collectRoutesRule,
        },
      },
    },
    rules: {
      'fixtureCoverage/collect-routes': 'error',
    },
  }]);
  const parserDiagnostic = messages.find(({ fatal }) => fatal);
  if (parserDiagnostic) {
    throw new SyntaxError(
      `Invalid visual spec at ${parserDiagnostic.line}:${parserDiagnostic.column}: ${parserDiagnostic.message}`,
    );
  }

  return routes;
}

export function hasActiveFixtureRoute(source, route) {
  return collectFixtureRoutes(source).has(route);
}

test('route registration ignores line comments', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    defineVisualFixture({
      name: 'example',
      // path: '${route}',
      path: '/test/a11y/fixtures/other.html',
    });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration ignores block comments', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    defineVisualFixture({
      name: 'example',
      /* path: '${route}', */
      path: '/test/a11y/fixtures/other.html',
    });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration ignores unused route strings', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    const unusedRoute = "defineVisualFixture({ path: '${route}' })";
    defineVisualFixture({ path: '/test/a11y/fixtures/other.html' });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration rejects member calls', () => {
  const route = '/test/a11y/fixtures/example.html';
  assert.equal(
    hasActiveFixtureRoute(`helpers.defineVisualFixture({ path: '${route}' });`, route),
    false,
  );
});

test('route registration rejects optional member calls', () => {
  const route = '/test/a11y/fixtures/example.html';
  assert.equal(
    hasActiveFixtureRoute(`helpers?.defineVisualFixture({ path: '${route}' });`, route),
    false,
  );
});

test('route registration rejects optional direct calls', () => {
  const route = '/test/a11y/fixtures/example.html';
  assert.equal(
    hasActiveFixtureRoute(`defineVisualFixture?.({ path: '${route}' });`, route),
    false,
  );
});

test('route registration ignores call-shaped text in regex literals', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = String.raw`
    const matcher = /[)]defineVisualFixture({ path: '\/test\/a11y\/fixtures\/example.html' })/;
    defineVisualFixture({ path: '/test/a11y/fixtures/other.html' });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration ignores call-shaped regex literals in control flow', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = String.raw`
    if (enabled) /[)]defineVisualFixture({ path: '\/test\/a11y\/fixtures\/example.html' })/.test(value);
    defineVisualFixture({ path: '/test/a11y/fixtures/other.html' });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration does not cross into unrelated calls', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    defineVisualFixture({ name: 'example' });
    configureSomethingElse({ path: '${route}' });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration accepts path as the first property', () => {
  const route = '/test/a11y/fixtures/example.html';
  assert.equal(hasActiveFixtureRoute(`defineVisualFixture({ path: '${route}' });`, route), true);
});

test('route registration accepts an active defineVisualFixture path', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    const unrelated = configure({ path: '/not-the-fixture.html' });
    defineVisualFixture({
      name: 'example',
      path: '${route}',
      visualRoot: '.example',
    });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), true);
});

test('route registration accepts an active gotoFixture path', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    test('example', async ({ page }) => {
      await gotoFixture(page, {
        path: '${route}',
        readySelector: '.example',
      });
    });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), true);
});

test('route registration accepts a trailing comma after a defineVisualFixture config', () => {
  const route = '/test/a11y/fixtures/example.html';
  assert.equal(
    hasActiveFixtureRoute(`defineVisualFixture({ path: '${route}' },);`, route),
    true,
  );
});

test('route registration accepts a trailing comma after a gotoFixture config', () => {
  const route = '/test/a11y/fixtures/example.html';
  assert.equal(
    hasActiveFixtureRoute(`gotoFixture(page, { path: '${route}' },);`, route),
    true,
  );
});

test('route registration ignores commented gotoFixture calls', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    // await gotoFixture(page, { path: '${route}' });
    await gotoFixture(page, { path: '/test/a11y/fixtures/other.html' });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration ignores unused gotoFixture strings', () => {
  const route = '/test/a11y/fixtures/example.html';
  const source = `
    const unused = "gotoFixture(page, { path: '${route}' })";
    await gotoFixture(page, { path: '/test/a11y/fixtures/other.html' });
  `;
  assert.equal(hasActiveFixtureRoute(source, route), false);
});

test('route registration reports invalid spec syntax', () => {
  assert.throws(
    () => hasActiveFixtureRoute('defineVisualFixture({'),
    /Invalid visual spec at 1:\d+: Parsing error:/,
  );
});

test('every accessibility fixture has a visual spec using its exact route', async () => {
  const fixtures = await inventoryHtmlFiles(FIXTURES_ROOT);
  const fixtureSet = new Set(fixtures);
  const failures = [];

  EXEMPT_FIXTURES.forEach((reason, fixture) => {
    if (!fixtureSet.has(fixture)) {
      failures.push(`Exemption references missing fixture: ${fixture}`);
    }
    if (typeof reason !== 'string' || reason.trim() === '') {
      failures.push(`Exemption requires a non-empty reason: ${fixture}`);
    }
  });

  await Promise.all(fixtures.map(async (fixture) => {
    if (EXEMPT_FIXTURES.has(fixture)) {
      return;
    }

    const relativeSpecPath = expectedSpecPath(fixture);
    const absoluteSpecPath = path.resolve(TEST_ROOT, '../..', relativeSpecPath);
    const route = `/test/a11y/fixtures/${fixture}`;
    let source;

    try {
      source = await readFile(absoluteSpecPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        failures.push(`${fixture}: missing expected spec ${relativeSpecPath}`);
        return;
      }
      throw error;
    }

    try {
      if (!hasActiveFixtureRoute(source, route)) {
        failures.push(`${fixture}: ${relativeSpecPath} does not contain exact route ${route}`);
      }
    } catch (error) {
      failures.push(`${fixture}: invalid spec ${relativeSpecPath}: ${error.message}`);
    }
  }));

  assert.deepEqual(failures.sort(), [], `Visual fixture coverage failures:\n${failures.sort().join('\n')}`);
});
