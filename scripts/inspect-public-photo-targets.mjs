import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const menuPath = path.join(root, 'src', 'data', 'menuItems.ts');
const menuSource = fs.readFileSync(menuPath, 'utf8');
const itemPattern = /id:\s*['"]([^'"]+)['"][\s\S]{0,700}?name:\s*['"]([^'"]+)['"]/g;
const items = [];
for (const match of menuSource.matchAll(itemPattern)) items.push({ id: match[1], name: match[2] });

const wanted = [
  'KitKat Shake', 'Crispy Corn', 'Paneer Fried Rice', 'Blue Lagoon',
  'White Sauce Pasta', 'Honey Chilli Potato', 'French Fries', 'Veg Noodles',
  'Oreo Shake', 'Veg Steamed Momos', 'Pan Fried Momos', 'Chilli Chicken Dry',
  'Tandoori Chicken Lollipop', 'Egg Chicken Fried Rice', 'Dal Makhani',
  'Vanilla Ice Cream'
];

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const matches = wanted.map((name) => {
  const exact = items.find((item) => normalize(item.name) === normalize(name));
  const partial = items.filter((item) => normalize(item.name).includes(normalize(name)) || normalize(name).includes(normalize(item.name)));
  return { wanted: name, exact, partial: partial.slice(0, 5) };
});

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (/\.(tsx|jsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

const uiFiles = walk(path.join(root, 'src')).map((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const score = ['hero', 'gallery', 'menu', 'home', '<main', 'App'].reduce((n, term) => n + (source.toLowerCase().includes(term.toLowerCase()) ? 1 : 0), 0);
  return { file: path.relative(root, file), score, chars: source.length };
}).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);

const lines = [
  `Menu items parsed: ${items.length}`,
  '',
  ...matches.flatMap((entry) => [
    `${entry.wanted}: ${entry.exact ? `${entry.exact.id} | ${entry.exact.name}` : 'NO EXACT MATCH'}`,
    ...(!entry.exact ? entry.partial.map((item) => `  candidate: ${item.id} | ${item.name}`) : [])
  ]),
  '',
  'Likely public UI files:',
  ...uiFiles.map((entry) => `${entry.file} (score ${entry.score}, ${entry.chars} chars)`)
];

const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const height = Math.max(700, 42 + lines.length * 24);
const tspans = lines.map((line, index) => `<tspan x="24" y="${34 + index * 24}">${escape(line)}</tspan>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${height}"><rect width="100%" height="100%" fill="#111827"/><text font-family="Consolas, monospace" font-size="17" fill="#f9fafb">${tspans}</text></svg>`;
fs.writeFileSync(path.join(root, 'photo-match-report.svg'), svg);
