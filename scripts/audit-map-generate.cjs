/* Generator dokumentasi: parse source sebagai data, tidak mengimpor aplikasi. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');            // scripts/ -> akar repo
const OUT = path.join(ROOT, '.audit-map');             // peta keluar dari docs/ sejak batch B3 (2026-10-05)
const slash = p => p.replace(/\\/g, '/');
const rel = p => slash(path.relative(ROOT, p));
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
let ts;
for (const base of ['backend', 'frontend']) {
  try { ts = require(path.join(ROOT, base, 'node_modules/typescript')); break; } catch {}
}
if (!ts) throw new Error('Parser TypeScript lokal belum tersedia; generator tidak menginstal dependency.');
const write = (p, content) => {
  const dest = path.resolve(OUT, p);
  if (!dest.startsWith(OUT + path.sep)) throw new Error('Output di luar folder peta');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content + '\n', 'utf8');
};
const md = value => String(value).replace(/\|/g, '&#124;').replace(/[\r\n]/g, ' ');
const link = (from, to, label) => `[${md(label)}](<${slash(path.relative(path.dirname(path.join(OUT, from)), path.join(OUT, to)))}>)`;
const sourceLink = (from, file) => `[source](<${slash(path.relative(path.dirname(path.join(OUT, from)), path.join(ROOT, file)))}>)`;
const skipped = new Set(['node_modules', 'dist', 'generated', 'coverage', '.git', '.claude', '.codex', '.agents', 'playwright-report', 'test-results', 'e2e-out', 'reference', 'archieve']);
const files = new Set();
function walk(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  for (const item of fs.readdirSync(full, { withFileTypes: true })) {
    if (item.isSymbolicLink() || skipped.has(item.name) || item.name.startsWith('.env')) continue;
    const p = slash(path.join(dir, item.name));
    if (item.isDirectory()) walk(p);
    else if (!/\.(log|tgz|zip|tsbuildinfo|pem|key|p12|pfx)$/i.test(item.name)) files.add(p);
  }
}
const roots = ['backend/src', 'frontend/src', 'frontend/public', 'backend/test', 'frontend/e2e', 'backend/scripts', 'frontend/scripts', 'scripts', 'backend/prisma', '.github'];
roots.forEach(walk);
for (const dir of ['', 'backend', 'frontend', 'deploy']) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const item of fs.readdirSync(full, { withFileTypes: true })) {
    if (!item.isFile() || item.name.startsWith('.env') || /lock|seed-data|secret|credential|\.log$|\.tgz$|\.zip$|\.tsbuildinfo$/i.test(item.name)) continue;
    if (/\.(?:json|[cm]?js|tsx?|ya?ml|toml|ps1|sh|sql)$/i.test(item.name) || ['.htaccess', '.gitignore', 'Dockerfile'].includes(item.name)) files.add(slash(path.join(dir, item.name)));
  }
}
function groupFor(p) {
  const a = p.split('/');
  if (p.startsWith('backend/prisma/')) return { category: 'database', group: 'database/schema-migrations' };
  if (p.startsWith('backend/test/')) return { category: 'tests', group: 'tests/backend-' + (a[2] || 'root') };
  if (p.startsWith('frontend/e2e/')) return { category: 'tests', group: 'tests/frontend-e2e' };
  if (p.startsWith('frontend/src/test/')) return { category: 'tests', group: 'tests/frontend-' + (a.length > 4 ? a[3] : 'root') };
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(p)) return { category: 'tests', group: 'tests/' + a[0] + '-colocated' };
  if (p.startsWith('backend/src/modules/')) return { category: 'backend', group: 'backend/modules/' + a[3] };
  if (p.startsWith('backend/src/')) return { category: 'backend', group: 'backend/infra/' + (a.length > 3 ? a[2] : 'root') };
  if (p.startsWith('frontend/src/pages/')) return { category: 'frontend', group: 'frontend/pages/' + (a.length > 4 ? a[3] : 'root') };
  if (p.startsWith('frontend/src/components/')) return { category: 'frontend', group: 'frontend/components/' + (a.length > 4 ? a[3] : 'root') };
  if (p.startsWith('frontend/src/')) return { category: 'frontend', group: 'frontend/shared/' + (a.length > 3 ? a[2] : 'root') };
  if (p.startsWith('frontend/public/')) return { category: 'frontend', group: 'frontend/static/' + (a.length > 3 ? a[2] : 'root') };
  return { category: 'tooling', group: 'tooling/' + (a.length === 1 ? 'root' : a[0] === 'scripts' ? 'scripts' : a[0] === '.github' ? 'github' : a[0] + '-' + (a[1] === 'scripts' ? 'scripts' : 'config')) };
}
function modeFor(p) {
  if (p === 'backend/prisma/schema.prisma') return 'schema';
  if (p.startsWith('frontend/public/')) return 'metadata';
  if (/fixture|seed|\/data\/|snapshot|bootstrap.*sql|migration/i.test(p) && !p.endsWith('/seed-audit-users.js')) return 'metadata';
  if (p.startsWith('deploy/')) return 'metadata';
  return /\.[cm]?[jt]sx?$/.test(p) ? 'AST' : 'metadata';
}
const branchKinds = new Map([
  [ts.SyntaxKind.IfStatement, 'if'], [ts.SyntaxKind.ConditionalExpression, 'ternary'],
  [ts.SyntaxKind.SwitchStatement, 'switch'], [ts.SyntaxKind.CaseClause, 'case'],
  [ts.SyntaxKind.DefaultClause, 'default'], [ts.SyntaxKind.CatchClause, 'catch'],
  [ts.SyntaxKind.ForStatement, 'for'], [ts.SyntaxKind.ForOfStatement, 'for-of'],
  [ts.SyntaxKind.ForInStatement, 'for-in'], [ts.SyntaxKind.WhileStatement, 'while'],
  [ts.SyntaxKind.DoStatement, 'do-while'],
]);
const opKinds = new Map([[ts.SyntaxKind.AmpersandAmpersandToken, 'AND'], [ts.SyntaxKind.BarBarToken, 'OR'], [ts.SyntaxKind.QuestionQuestionToken, 'NULLISH']]);
const plainName = n => n && (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) ? n.text : null;
function expressionName(n) {
  if (!n) return '';
  if (n.kind === ts.SyntaxKind.ThisKeyword) return 'this';
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isPropertyAccessExpression(n)) return expressionName(n.expression) + '.' + n.name.text;
  if (ts.isElementAccessExpression(n)) return expressionName(n.expression) + '.[dynamic]';
  return '[dynamic]';
}
function scan(p, body) {
  const sf = ts.createSourceFile(p, body, ts.ScriptTarget.Latest, true, p.endsWith('tsx') ? ts.ScriptKind.TSX : /\.[cm]?js$/.test(p) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const line = n => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const endLine = n => sf.getLineAndCharacterOfPosition(n.end).line + 1;
  const result = { symbols: [], branches: [], declarations: [], imports: [], routes: [], endpoints: [], diagnostics: [] };
  const usedNames = new Set();
  for (const d of sf.parseDiagnostics) result.diagnostics.push({ code: d.code, line: sf.getLineAndCharacterOfPosition(d.start || 0).line + 1 });
  const decorators = n => ts.canHaveDecorators(n) ? ts.getDecorators(n) || [] : [];
  const decoratorInfo = n => decorators(n).map(d => ({ name: ts.isCallExpression(d.expression) ? expressionName(d.expression.expression) : expressionName(d.expression), args: ts.isCallExpression(d.expression) ? d.expression.arguments : [] }));
  const safeRoute = n => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /^[a-zA-Z0-9_/:.*?{}-]*$/.test(n.text) ? n.text : n ? '[dynamic]' : '';
  const rolesOf = n => decoratorInfo(n).filter(d => d.name === 'Roles').flatMap(d => d.args.map(a => expressionName(a))).filter(x => !x.includes('[dynamic]'));
  function visit(n, owner = null, parentName = '', controller = null) {
    let localOwner = owner, localParent = parentName, localController = controller;
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isEnumDeclaration(n)) {
      localParent = [parentName, plainName(n.name)].filter(Boolean).join('.');
      result.declarations.push({ name: localParent, kind: ts.SyntaxKind[n.kind], line: line(n), attributes: [] });
    }
    if (ts.isPropertyDeclaration(n) || ts.isPropertySignature(n) || ts.isEnumMember(n)) {
      const fieldName = plainName(n.name) || '[computed]';
      result.declarations.push({ name: [parentName, fieldName].filter(Boolean).join('.'), kind: ts.SyntaxKind[n.kind], line: line(n), attributes: decoratorInfo(n).map(d=>d.name) });
    }
    if (ts.isClassDeclaration(n)) {
      localParent = plainName(n.name) || 'class@L' + line(n);
      const dec = decoratorInfo(n).find(d => d.name === 'Controller');
      localController = dec ? { prefix: safeRoute(dec.args[0]), roles: rolesOf(n) } : controller;
      result.symbols.push({ name: localParent, kind: 'class', line: line(n), end: endLine(n), calls: new Set(), models: new Set(), parent: parentName });
    }
    const fn = ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n);
    if (fn) {
      const variable = n.parent && ts.isVariableDeclaration(n.parent) ? plainName(n.parent.name) : null;
      const property = n.parent && (ts.isPropertyAssignment(n.parent) || ts.isPropertyDeclaration(n.parent)) ? plainName(n.parent.name) : null;
      const ownName = plainName(n.name) || variable || property || (ts.isConstructorDeclaration(n) ? 'constructor' : 'callback@L' + line(n));
      let name = [parentName, ownName].filter(Boolean).join('.');
      if (usedNames.has(name)) name += '@L' + line(n) + ':' + (sf.getLineAndCharacterOfPosition(n.getStart(sf)).character + 1);
      usedNames.add(name);
      localOwner = { name, kind: ts.SyntaxKind[n.kind], line: line(n), end: endLine(n), parent: parentName, calls: new Set(), models: new Set() };
      localParent = name;
      result.symbols.push(localOwner);
      for (const d of decoratorInfo(n).filter(d => ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All'].includes(d.name))) {
        result.endpoints.push({ method: d.name.toUpperCase(), controller: localController ? localController.prefix : '[unknown]', route: safeRoute(d.args[0]), symbol: name, line: line(n), roles: rolesOf(n).length ? rolesOf(n) : localController ? localController.roles : [], public: decoratorInfo(n).some(x => x.name === 'Public') });
      }
    }
    let branch = branchKinds.get(n.kind);
    if (ts.isBinaryExpression(n)) branch = opKinds.get(n.operatorToken.kind) || branch;
    if (n.questionDotToken) branch = 'optional-chain';
    if (branch) result.branches.push({ owner: localOwner ? localOwner.name : '(top-level)', kind: branch, line: line(n), col: sf.getLineAndCharacterOfPosition(n.getStart(sf)).character + 1 });
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) result.imports.push(n.moduleSpecifier.text);
    if (ts.isCallExpression(n)) {
      const call = expressionName(n.expression);
      if (localOwner) {
        localOwner.calls.add(call);
        const match = call.match(/(?:^|\.)(?:prisma|tx|transaction)\.([A-Za-z]\w*)\./);
        if (match) localOwner.models.add(match[1]);
      }
      if ((n.expression.kind === ts.SyntaxKind.ImportKeyword || call === 'require') && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) result.imports.push(n.arguments[0].text);
    }
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && expressionName(n.tagName) === 'Route') {
      const attrs = n.attributes.properties;
      const pAttr = attrs.find(a => ts.isJsxAttribute(a) && plainName(a.name) === 'path');
      if (pAttr) {
        const init = pAttr.initializer;
        const value = init && ts.isJsxExpression(init) ? init.expression : init;
        const elements = new Set(), roles = new Set();
        const elem = attrs.find(a => ts.isJsxAttribute(a) && plainName(a.name) === 'element');
        function routeVisit(x) {
          if (ts.isJsxSelfClosingElement(x) || ts.isJsxOpeningElement(x)) elements.add(expressionName(x.tagName));
          if (ts.isStringLiteral(x) && ['OWNER', 'ADMIN', 'STAFF', 'TENANT'].includes(x.text)) roles.add(x.text);
          ts.forEachChild(x, routeVisit);
        }
        if (elem) routeVisit(elem);
        result.routes.push({ path: safeRoute(value), line: line(n), elements: [...elements], roles: [...roles] });
      }
    }
    ts.forEachChild(n, child => visit(child, localOwner, localParent, localController));
  }
  visit(sf);
  result.imports = [...new Set(result.imports)].sort();
  result.symbols = result.symbols.map(s => ({ ...s, calls: [...s.calls].sort(), models: [...s.models].sort() }));
  return result;
}
const inventory = [], groups = new Map();
let sourceHash = crypto.createHash('sha256');
for (const p of [...files].sort()) {
  const mode = modeFor(p), grouping = groupFor(p);
  const entry = { file: p, ...grouping, mode, bytes: fs.statSync(path.join(ROOT, p)).size, symbols: 0, branches: 0 };
  if (!groups.has(entry.group)) groups.set(entry.group, []);
  if (mode === 'AST') {
    const body = read(p), info = scan(p, body);
    entry.hash = hash(body); entry.symbols = info.symbols.length; entry.branches = info.branches.length;
    entry.leaf = 'files/' + p + '.md'; entry.diagnostics = info.diagnostics;
    sourceHash.update(p + '\0' + entry.hash + '\n');
    const lines = ['# ' + p, '', link(entry.leaf, entry.group + '.md', 'Kelompok') + ' · ' + sourceLink(entry.leaf, p), '', '`TERPETAKAN` — inventaris sintaks, bukan hasil audit atau coverage runtime.', '', `SHA-256 source: \`${entry.hash}\`. Baris berlaku pada snapshot ini.`, '', '## Import', '', info.imports.length ? info.imports.map(i => '- `' + md(i) + '`').join('\n') : 'Tidak ada import statis yang dikenali.'];
    if (info.endpoints.length) lines.push('', '## Endpoint/decorator lokal', '', 'Prefix global/guard warisan/role efektif perlu ditelusuri. Kosong bukan public. Metadata Public hanya dekorator metode.', '', '| Verb | Controller | Path lokal | Handler | Role literal | Public metode | Baris |', '|---|---|---|---|---|---|---|', ...info.endpoints.map(e => `| ${e.method} | \`${md(e.controller)}\` | \`${md(e.route)}\` | ${md(e.symbol)} | ${e.roles.join(', ')} | ${e.public} | ${e.line} |`));
    if (info.routes.length) lines.push('', '## Route JSX lokal', '', 'Role di element lokal saja; ancestor/wrapper dan route dinamis memerlukan penelusuran.', '', '| Path | Element | Role literal | Baris |', '|---|---|---|---|', ...info.routes.map(r => `| \`${md(r.path)}\` | ${r.elements.join(', ')} | ${r.roles.join(', ')} | ${r.line} |`));
    if (info.declarations.length) lines.push('', '## Deklarasi/field', '', 'Nama dan dekorator saja; tipe lengkap, nilai default dan ekspresi constraint ditelusuri pada source.', '', '| Nama | Jenis | Dekorator | Baris |', '|---|---|---|---|', ...info.declarations.map(d=>`| ${md(d.name)} | ${d.kind} | ${d.attributes.join(', ')} | ${d.line} |`));
    lines.push('', '## Simbol dan percabangan', '', 'Cari satu simbol dengan rg; baca hanya bagian itu. Pemanggilan hanya nama ekspresi, tanpa argumen; alias/DI/SQL mentah belum diresolusikan. Branch B<n> beridentitas file + lokasi + owner, bukan ID permanen setelah source berubah.');
    for (const s of info.symbols) {
      const bs = info.branches.map((b, i) => ({ ...b, id: i + 1 })).filter(b => b.owner === s.name);
      lines.push('', `### ${md(s.name)} — L${s.line}–${s.end}`, '', `Jenis: ${s.kind}; induk: ${md(s.parent || '(top-level)')}.`);
      if (s.models.length) lines.push('Petunjuk model Prisma: ' + s.models.map(x => '`' + x + '`').join(', ') + '.');
      if (s.calls.length) lines.push('Pemanggilan: ' + s.calls.map(x => '`' + md(x) + '`').join(', ') + '.');
      lines.push(bs.length ? 'Branch: ' + bs.map(b => `B${b.id} ${b.kind}@${b.line}:${b.col}`).join('; ') + '.' : 'Branch sintaks terdeteksi: 0 (bukan bukti tanpa risiko/efek).');
    }
    const top = info.branches.map((b,i)=>({...b,id:i+1})).filter(b=>b.owner==='(top-level)');
    if (top.length) lines.push('', '## Kondisi top-level', '', top.map(b=>`B${b.id} ${b.kind}@${b.line}:${b.col}`).join('; '));
    if (!info.symbols.length) lines.push('', 'Tidak ada fungsi/class yang dikenali; periksa deklarasi DTO/type/konfigurasi pada source.');
    if (info.diagnostics.length) lines.push('', '## Keterbatasan parsing', '', ...info.diagnostics.map(d => `- Diagnostic ${d.code} pada L${d.line}; isi source tidak disalin.`));
    write(entry.leaf, lines.join('\n'));
  } else if (mode === 'schema') {
    const body = read(p); entry.hash = hash(body); sourceHash.update(p + '\0' + entry.hash + '\n');
    const schema = ['| Jenis | Nama | Baris | Rincian |','|---|---|---:|---|'], counts = { models: 0, enums: 0 };
    const matches = [...body.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
    const schemaTargets = new Map(matches.map(m=>[m[2], 'database/' + (m[1]==='model'?'models/':'enums/') + m[2]+'.md']));
    for (const match of matches) {
      counts[match[1] === 'model' ? 'models' : 'enums']++;
      const dest = schemaTargets.get(match[2]);
      const startLine = body.slice(0, match.index).split('\n').length;
      schema.push(`| ${match[1]} | ${match[2]} | ${startLine} | ${link('database/schema.md',dest,'Leaf')} |`);
      const fields = ['# ' + match[1] + ' ' + match[2], '', link(dest,'database/schema.md','Indeks schema')+' · '+sourceLink(dest,p), '', 'Snapshot source: `'+entry.hash+'`; mulai L'+startLine+'.', '', 'Nama/tipe/atribut; default dan ekspresi constraint dibaca pada source. TERPETAKAN bukan verifikasi data/DB.', ''];
      for (const raw of match[3].split(/\r?\n/)) {
        const clean = raw.trim(); if (!clean || clean.startsWith('//')) continue;
        const field = clean.match(/^(\w+)\s*([\w?\[\]]*)/);
        if (field) {
          const typeName=field[2].replace(/[?\[\]]/g,'');
          fields.push('- `' + field[1] + '`' + (match[1] === 'model' ? ' : `' + field[2] + '`' : '') + (match[1] === 'model' ? ' · atribut: ' + ([...clean.matchAll(/@(\w+)/g)].map(x=>x[1]).join(', ') || '—') : '') + (schemaTargets.has(typeName)?' · '+link(dest,schemaTargets.get(typeName),'Tipe/relasi'):''));
        } else if (clean.startsWith('@@')) fields.push('- Constraint: `' + (clean.match(/^@@(\w+)/) || [,'dynamic'])[1] + '`; detail source.');
      }
      write(dest,fields.join('\n'));
    }
    entry.schemaCounts = counts; entry.leaf = 'database/schema.md';
    write(entry.leaf, '# Schema Prisma\n\n' + sourceLink(entry.leaf,p) + '\n\nNama model/enum/field/type/jenis atribut saja; nilai default, constraint expression dan data tidak disalin. Relasi lengkap ditelusuri pada source.\n\nSHA-256: `' + entry.hash + '`\n' + schema.join('\n'));
  }
  inventory.push(entry); groups.get(entry.group).push(entry);
}
for (const [group, entries] of groups) {
  const dest = group + '.md';
  write(dest, ['# ' + group, '', link(dest, 'GENERATED_INDEX.md', 'Indeks utama') + ' · ' + link(dest, 'README.md', 'Panduan'), '', 'Satu baris per file dalam cakupan. Buka satu leaf; metadata-only berarti isi tidak dianalisis, bukan file sudah diaudit.', '', '| File | Mode | Simbol | Branch | Leaf/source |', '|---|---|---:|---:|---|', ...entries.map(e=>`| \`${md(e.file)}\` | ${e.mode} | ${e.symbols} | ${e.branches} | ${e.leaf ? link(dest,e.leaf,'Leaf') : sourceLink(dest,e.file)} |`)].join('\n'));
}
const categories = [...new Set(inventory.map(x=>x.category))].sort();
for (const category of categories) {
  const dest = category + '/INDEX.md';
  const names = [...groups.keys()].filter(g=>g.startsWith(category+'/')).sort();
  write(dest, ['# ' + category, '', link(dest, 'README.md', 'Peta utama'), '', ...names.map(g=>'- '+link(dest,g+'.md',g)+' — '+groups.get(g).length+' file')].join('\n'));
}
for (const prefix of ['backend/modules', 'frontend/pages', 'frontend/components']) {
  const dest = prefix + '/INDEX.md';
  write(dest, ['# ' + prefix, '', link(dest,'README.md','Peta utama'), '', ...[...groups.keys()].filter(g=>g.startsWith(prefix+'/')).sort().map(g=>'- '+link(dest,g+'.md',g.slice(prefix.length+1))+' — '+groups.get(g).length+' file')].join('\n'));
}
// Stempel HEAD dibaca dari berkas git (tanpa spawn proses): aman di sandbox, tidak butuh `git` di PATH.
// Urutan: berkas .git/HEAD -> fallback perintah git (bila tersedia) -> 'UNKNOWN'.
function bacaHeadDariGit(akar) {
  try {
    const dotGit = path.join(akar, '.git');
    if (!fs.existsSync(dotGit)) return null;
    const stat = fs.statSync(dotGit);
    let gitDir = dotGit;
    if (stat.isFile()) {                                  // worktree/submodule: .git berisi "gitdir: <path>"
      const isi = fs.readFileSync(dotGit, 'utf8').trim();
      const m = isi.match(/^gitdir:\s*(.+)$/i);
      if (!m) return null;
      gitDir = path.resolve(akar, m[1].trim());
    }
    const headRaw = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    const ref = headRaw.match(/^ref:\s*(.+)$/i);
    if (!ref) return /^[0-9a-f]{7,40}$/i.test(headRaw) ? headRaw : null;
    const refPath = path.join(gitDir, ...ref[1].trim().split('/'));
    if (fs.existsSync(refPath)) return fs.readFileSync(refPath, 'utf8').trim();
    const packed = path.join(gitDir, 'packed-refs');       // ref yang sudah dipak
    if (fs.existsSync(packed)) {
      for (const line of fs.readFileSync(packed, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([0-9a-f]{40})\s+(.+)$/);
        if (m && m[2] === ref[1].trim()) return m[1];
      }
    }
    return null;
  } catch { return null; }
}
let head = bacaHeadDariGit(ROOT) || null;
try { head = head || cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); } catch {}
if (!head) head = 'UNKNOWN';
const totals = { files: inventory.length, astFiles: inventory.filter(x=>x.mode==='AST').length, metadataFiles: inventory.filter(x=>x.mode==='metadata').length, schemaFiles: inventory.filter(x=>x.mode==='schema').length, groups: groups.size, symbols: inventory.reduce((a,x)=>a+x.symbols,0), branches: inventory.reduce((a,x)=>a+x.branches,0) };
const diagnostics = inventory.filter(x=>x.diagnostics && x.diagnostics.length).map(x=>({file:x.file,diagnostics:x.diagnostics}));
const summary = { date: new Date().toISOString(), head, sourceFingerprint: sourceHash.digest('hex'), parser: ts.version, totals, categories, groups:[...groups.keys()].sort(), roots, exclusions:[...skipped,'.env*','secret/key/archive/log files','deploy generated subdirectories','root historical data/documents outside allowlisted roots'], validation:{uniqueFiles:files.size===inventory.length,missingSources:inventory.filter(x=>!fs.existsSync(path.join(ROOT,x.file))).map(x=>x.file),parseDiagnostics:diagnostics}, schema:inventory.find(x=>x.schemaCounts)?.schemaCounts };
write('inventory.json',JSON.stringify(inventory,null,2));
write('summary.json',JSON.stringify(summary,null,2));
write('GENERATED_INDEX.md', ['# Indeks Otomatis Source KOST48', '', '[Peta utama](README.md) · [Cara audit](CARA_AUDIT.md)', '', 'Snapshot: '+summary.date+'; HEAD lokal `'+head+'` (working tree dapat berbeda dari HEAD).', '', 'Fingerprint source yang diparse: `'+summary.sourceFingerprint+'`.', '', `Parser TypeScript lokal ${ts.version}; ${totals.files} file dalam cakupan, ${totals.astFiles} AST, ${totals.metadataFiles} metadata, ${totals.schemaFiles} schema; ${totals.groups} kelompok; ${totals.symbols} simbol; ${totals.branches} titik branch sintaks.`, '', '## Kategori', '', ...categories.map(c=>'- '+link('GENERATED_INDEX.md',c+'/INDEX.md',c)), '', '## Makna dan batas', '', '- TERPETAKAN bukan hasil audit, test coverage atau bukti deployment. Call/role/model adalah petunjuk statis, bukan jaminan perilaku efektif.', '- Cabang sintaks: if, switch/case/default, ternary, catch, loop, AND/OR/NULLISH, optional chaining; tidak menghitung semua kombinasi jalur runtime.', '- Simbol: class, function, method, constructor, accessor dan callback; DTO/type/config tanpa fungsi tetap tercatat sebagai file dan ditelusuri pada source.', '- Markdown per kelompok hanya daftar file; leaf berisi nama simbol/call/import dan lokasi. Literals/argumen/isi fungsi tidak disalin; route literal yang bentuknya dibatasi merupakan metadata endpoint.', '- Metadata-only: data/fixture/seed historis, SQL migration, asset/style/konfigurasi non-program dan file lain tanpa AST. Ini area audit lanjutan, bukan klaim cakupan perilaku penuh.', '- Root pemindaian: '+roots.map(r=>'`'+r+'`').join(', ')+'. Config top-level root/backend/frontend/deploy terpilih ikut terdaftar.', '- Dikecualikan: dependency, generated client, build, arsip/reference, env/secret/key, output test/log, bundle, symlink. Frontend public/static asset masuk metadata-only; upload penghuni privat dan file di luar root terpilih tidak dipindai.', '- Metadata migration/schema bukan koneksi atau pengukuran DB. Schema menampilkan field/type/jenis atribut; nilai default dan ekspresi constraint dibaca terarah pada source.', '- Impor relatif/alias/DI/SQL mentah dan efek bisnis memerlukan penelusuran source; nama panggilan kosong bukan bukti tanpa efek.', '', '## Validasi', '', '- File unik: '+summary.validation.uniqueFiles+'; source hilang: '+summary.validation.missingSources.length+'; file dengan diagnostic parse: '+diagnostics.length+'.', ...diagnostics.map(x=>'- `'+x.file+'`: '+x.diagnostics.map(d=>d.code+'@L'+d.line).join(', ')), '', '## Regenerasi', '', '`node docs/audit-map/generate.cjs` dari root. Tidak menjalankan source aplikasi, build, test, API atau DB; hanya parser dari dependency yang sudah ada. Tidak menghapus file otomatis; file tidak lagi tercantum di inventory dianggap stale dan jangan dipakai sebagai daftar aktif.', '', '`summary.json`/`inventory.json` untuk pencarian mesin; jangan memuat seluruh JSON/peta ke konteks. Buka satu kelompok dan satu leaf.'].join('\n'));
console.log(JSON.stringify({totals,schema:summary.schema,parseDiagnosticFiles:diagnostics.length,sourceFingerprint:summary.sourceFingerprint},null,2));
if (!summary.validation.uniqueFiles || summary.validation.missingSources.length || diagnostics.length) process.exitCode=1;
