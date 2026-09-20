import { existsSync, mkdtempSync, readFileSync, rmdirSync, statSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = {
  'frontend-auth': {
    cwd: 'frontend',
    testRunner: 'vitest',
    testFiles: ['src/test/pages/loginPage.test.tsx'],
    buildTarget: null,
    auditDoc: 'docs/audit/frontend-auth.md',
    prerequisites: ['node_modules lokal tersedia'],
  },
};

function parseArgs(args) {
  const [mode, id] = args;
  if (args.length !== 2 || !['test', 'build', 'audit'].includes(mode)
    || !Object.hasOwn(manifest, id)) {
    console.error('Argumen salah. Penggunaan: node scripts/verify-module.mjs <test|build|audit> <id-modul>');
    console.error(`ID tersedia: ${Object.keys(manifest).join(', ')}`);
    return null;
  }
  return { mode, id, module: manifest[id] };
}

function inspectPaths(module) {
  const cwd = resolve(root, module.cwd);
  const dependencies = join(cwd, 'node_modules');
  const runner = join(dependencies, 'vitest', 'vitest.mjs');
  return {
    cwd,
    runner,
    dependenciesAvailable: existsSync(dependencies) && statSync(dependencies).isDirectory()
      && existsSync(runner) && statSync(runner).isFile(),
    tests: module.testFiles.map((file) => ({
      file,
      exists: existsSync(resolve(cwd, file)) && statSync(resolve(cwd, file)).isFile(),
    })),
    auditExists: existsSync(resolve(root, module.auditDoc))
      && statSync(resolve(root, module.auditDoc)).isFile(),
  };
}

function runTests(module) {
  const paths = inspectPaths(module);
  if (!paths.dependenciesAvailable) {
    console.error(`Dependency lokal hilang: ${module.cwd}/node_modules atau executable Vitest lokal tidak tersedia.`);
    return 4;
  }
  if (!paths.tests.length || paths.tests.some((test) => !test.exists)) {
    console.error(`Daftar test kosong atau file test tidak ada: ${paths.tests.filter((test) => !test.exists).map((test) => test.file).join(', ')}`);
    return 1;
  }

  const tempDirectory = mkdtempSync(join(tmpdir(), 'kost48-verify-module-'));
  const reportPath = join(tempDirectory, 'vitest.json');
  const args = [paths.runner, 'run', '--reporter=json', `--outputFile=${reportPath}`, ...module.testFiles];
  let count = null;
  let exitCode = 1;
  const started = Date.now();
  console.log(`Command (cwd=${module.cwd}): ${[process.execPath, ...args].map((arg) => JSON.stringify(arg)).join(' ')}`);
  try {
    // Executable + array argumen; stderr diteruskan langsung tanpa shell/npm hook.
    const result = spawnSync(process.execPath, args, { cwd: paths.cwd, shell: false, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.signal) throw new Error(`Vitest dihentikan oleh sinyal ${result.signal}`);
    console.log(`Exit code Vitest: ${result.status}`);
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    if (!report || !Number.isSafeInteger(report.numTotalTests) || report.numTotalTests < 0) {
      throw new Error('Laporan JSON Vitest tidak memuat jumlah test yang valid');
    }
    count = report.numTotalTests;
    if (count === 0) throw new Error('Jumlah test nol; hasil ditolak');
    if (result.status === 0 && report.success === true) {
      exitCode = 0;
    } else {
      console.error('Vitest gagal atau laporan JSON tidak menyatakan sukses.');
    }
  } catch (error) {
    console.error(`Verifikasi test gagal: ${error.message}`);
  } finally {
    try {
      if (existsSync(reportPath)) unlinkSync(reportPath);
      rmdirSync(tempDirectory);
    } catch (error) {
      console.error(`Pembersihan laporan sementara gagal: ${error.message}`);
      exitCode = 1;
    }
  }
  console.log(`Jumlah test: ${count ?? 'UNKNOWN'} | Durasi: ${((Date.now() - started) / 1000).toFixed(3)} s | Exit code: ${exitCode}`);
  return exitCode;
}

function reportBuild(id) {
  console.log(`buildTarget belum tersedia untuk ${id}; tidak menjalankan build`);
  return 3;
}

function reportAudit(id, module) {
  const paths = inspectPaths(module);
  console.log(`Manifest ${id}: ada | cwd: ${module.cwd} | testRunner: ${module.testRunner} | buildTarget: ${module.buildTarget}`);
  console.log(`Prasyarat: ${module.prerequisites.join(', ')} | ${paths.dependenciesAvailable ? 'ada' : 'tidak ada'}`);
  for (const test of paths.tests) {
    console.log(`Test ${module.cwd}/${test.file}: ${test.exists ? 'ada' : 'tidak ada'}`);
  }
  console.log(`Audit doc ${module.auditDoc}: ${paths.auditExists ? 'ada' : 'belum ada'}`);
  console.log('Audit hanya melaporkan keberadaan path; tidak menjalankan test atau build.');
  return 0;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) return 2;
  if (parsed.mode === 'build') return reportBuild(parsed.id);
  if (parsed.mode === 'audit') return reportAudit(parsed.id, parsed.module);
  return runTests(parsed.module);
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`Verifikasi gagal: ${error.message}`);
  process.exitCode = 1;
}
