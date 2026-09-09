import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const suiteDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/tests',
)

// pgTAP compares the number of assertions it ran against the number the file
// declared, and reports a miscount as a failed test. Getting that number wrong
// is easy — adding or splitting an assertion is a two-line edit and the plan is
// twenty lines away — and the only place it currently surfaces is the CI job
// that needs Docker, which is not available on every machine that edits these
// files. Counting them here costs nothing and fails where the edit happens.
test('every pgTAP suite plans the number of assertions it makes', async () => {
  const files = (await readdir(suiteDirectory)).filter((name) => name.endsWith('.test.sql'))
  assert.ok(files.length > 0, 'expected pgTAP suites to exist')

  for (const file of files) {
    const suite = await readFile(join(suiteDirectory, file), 'utf8')

    const planned = suite.match(/^select plan\((\d+)\);$/m)
    assert.ok(planned, `${file} declares no plan`)

    // Assertions are the pgTAP functions called at the top level of a file. The
    // same names appear inside quoted SQL passed to lives_ok and throws_ok, so
    // only a call starting its own line counts.
    const assertions = suite.match(
      /^select (?:ok|is|isnt|has_table|hasnt_table|has_column|hasnt_column|has_view|has_index|col_is_pk|results_eq|results_ne|lives_ok|throws_ok|is_empty)\(/gm,
    ) ?? []

    assert.equal(
      assertions.length,
      Number(planned[1]),
      `${file} plans ${planned[1]} assertions but makes ${assertions.length}`,
    )
  }
})
