import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const stylesheetPath = fileURLToPath(
  new URL("../app/globals.css", import.meta.url),
);
const stylesheet = await readFile(stylesheetPath, "utf8");

function themeTokens(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "s"),
  );

  assert.ok(match, `لم يُعثر على كتلة الألوان: ${selector}`);

  return Object.fromEntries(
    [...match[1].matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)].map(
      ([, name, value]) => [name, value.toLowerCase()],
    ),
  );
}

const light = themeTokens(":root");
const dark = { ...light, ...themeTokens('html[data-theme="dark"]') };

function rgb(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i, `قيمة لون غير صالحة: ${hex}`);
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const [red, green, blue] = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function lab(hex) {
  const linear = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [red, green, blue] = linear;
  const xyz = [
    (red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047,
    red * 0.2126729 + green * 0.7151522 + blue * 0.072175,
    (red * 0.0193339 + green * 0.119192 + blue * 0.9503041) / 1.08883,
  ].map((value) =>
    value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27) * value / 116 + 16 / 116,
  );

  return [
    116 * xyz[1] - 16,
    500 * (xyz[0] - xyz[1]),
    200 * (xyz[1] - xyz[2]),
  ];
}

function deltaE76(first, second) {
  const firstLab = lab(first);
  const secondLab = lab(second);
  return Math.hypot(...firstLab.map((value, index) => value - secondLab[index]));
}

function assertContrast(tokens, foreground, background, minimum, themeName) {
  assert.ok(tokens[foreground], `${themeName}: الرمز ${foreground} مفقود`);
  assert.ok(tokens[background], `${themeName}: الرمز ${background} مفقود`);

  const ratio = contrastRatio(tokens[foreground], tokens[background]);
  assert.ok(
    ratio >= minimum,
    `${themeName}: ${foreground} على ${background} = ${ratio.toFixed(2)} < ${minimum}`,
  );
}

test("يثبّت مراسي لوحة البنفسجي والفيروزي والكهرماني", () => {
  assert.deepEqual(
    {
      primary: light["--primary"],
      teal: light["--kosif-teal"],
      amber: light["--kosif-amber"],
      coral: light["--kosif-coral"],
    },
    {
      primary: "#5b2acb",
      teal: "#087f86",
      amber: "#ad6700",
      coral: "#c93343",
    },
  );
  assert.deepEqual(
    {
      primary: dark["--primary"],
      teal: dark["--kosif-teal"],
      amber: dark["--kosif-amber"],
      coral: dark["--kosif-coral"],
    },
    {
      primary: "#9a7cff",
      teal: "#5cc3c5",
      amber: "#f0b652",
      coral: "#ff7b86",
    },
  );
});

test("أزواج النص الأساسية تجتاز تباين 4.5:1 في الوضعين", () => {
  const contracts = [
    ["--foreground", "--background"],
    ["--card-foreground", "--card"],
    ["--popover-foreground", "--popover"],
    ["--primary-foreground", "--primary"],
    ["--secondary-foreground", "--secondary"],
    ["--muted-foreground", "--muted"],
    ["--accent-foreground", "--accent"],
    ["--sidebar-foreground", "--sidebar"],
    ["--sidebar-primary-foreground", "--sidebar-primary"],
    ["--sidebar-accent-foreground", "--sidebar-accent"],
  ];

  for (const [tokens, themeName] of [
    [light, "فاتح"],
    [dark, "داكن"],
  ]) {
    for (const [foreground, background] of contracts) {
      assertContrast(tokens, foreground, background, 4.5, themeName);
    }
  }
});

test("ألوان الحالة تحافظ على تباين بصري 3:1 فوق الأسطح", () => {
  const contracts = [
    ["--primary", "--card"],
    ["--kosif-teal", "--card"],
    ["--kosif-amber", "--card"],
    ["--kosif-coral", "--card"],
    ["--kosif-teal", "--kosif-teal-soft"],
    ["--kosif-amber", "--kosif-amber-soft"],
    ["--kosif-coral", "--kosif-coral-soft"],
  ];

  for (const [tokens, themeName] of [
    [light, "فاتح"],
    [dark, "داكن"],
  ]) {
    for (const [foreground, background] of contracts) {
      assertContrast(tokens, foreground, background, 3, themeName);
    }
  }
});

test("الألوان الدلالية متباعدة إدراكيًا في الرؤية اللونية المعتادة", () => {
  const semanticTokens = [
    "--primary",
    "--kosif-teal",
    "--kosif-amber",
    "--kosif-coral",
  ];

  for (const [tokens, themeName] of [
    [light, "فاتح"],
    [dark, "داكن"],
  ]) {
    for (let first = 0; first < semanticTokens.length; first += 1) {
      for (let second = first + 1; second < semanticTokens.length; second += 1) {
        const firstToken = semanticTokens[first];
        const secondToken = semanticTokens[second];
        const distance = deltaE76(tokens[firstToken], tokens[secondToken]);

        assert.ok(
          distance >= 25,
          `${themeName}: الفصل بين ${firstToken} و${secondToken} = ${distance.toFixed(2)} < 25`,
        );
      }
    }
  }
});

test("تستخدم سلسلة المخطط مراسي اللوحة نفسها بلا تكرار", () => {
  const charts = [1, 2, 3, 4, 5].map((index) => light[`--chart-${index}`]);

  assert.equal(new Set(charts).size, charts.length);
  assert.equal(light["--chart-1"], light["--primary"]);
  assert.equal(light["--chart-2"], light["--kosif-teal"]);
  assert.equal(light["--chart-3"], light["--kosif-amber"]);
  assert.equal(light["--chart-4"], light["--kosif-coral"]);
});
