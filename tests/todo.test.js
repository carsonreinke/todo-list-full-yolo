import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { createTester } from 'tui-tester';

const dataDirectory = '/app/tests/.data';
const dataFile = `${dataDirectory}/6c2a9f31.bin`;
const appCommand = `stty raw -echo opost onlcr; java -Dtodo.data=${dataFile} -cp /app TodoApp`;

async function startApp({ resetStore = true } = {}) {
  if (resetStore) {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  const tester = new createTester(appCommand, { cols: 100, rows: 30 });
  await tester.start();
  await tester.waitForText('📝 TODO LIST');
  return tester;
}

async function withApp(run) {
  const tester = await startApp();
  try {
    await run(tester);
  } finally {
    await tester.stop();
  }
}

async function enter(tester, text) {
  await tester.sendText(text);
  await tester.sendKey('Enter');
}

async function key(tester, value) {
  await tester.sendKey(value === 'Space' ? 'space' : value);
}

test('renders the empty framed list and zero counts', async () => {
  await withApp(async (tester) => {
    await tester.waitForText('[All]');
    await tester.waitForText('(no tasks yet)');
    await tester.waitForText('0 pending • 0 completed');
    await tester.waitForText('Space: Toggle');
  });
});

test('adds a task with the default pending status and medium priority', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await tester.waitForText('New task:');
    await enter(tester, 'Write release notes');
    await tester.waitForText('> [ ] [MED] Write release notes');
    await tester.waitForText('1 pending • 0 completed');
  });
});

test('accepts n as an add shortcut', async () => {
  await withApp(async (tester) => {
    await key(tester, 'n');
    await tester.waitForText('New task:');
    await enter(tester, 'Prepare demo');
    await tester.waitForText('> [ ] [MED] Prepare demo');
  });
});

test('Space and Enter toggle completion and update the counts', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Review pull request');

    await key(tester, 'Space');
    await tester.waitForText('> [x] [MED] Review pull request');
    await tester.waitForText('0 pending • 1 completed');

    await tester.sendKey('Enter');
    await tester.waitForText('> [ ] [MED] Review pull request');
    await tester.waitForText('1 pending • 0 completed');
  });
});

test('edits the selected title', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Old title');
    await key(tester, 'e');
    await tester.waitForText('Edit task:');
    await enter(tester, 'New title');
    await tester.waitForText('> [ ] [MED] New title');
    assert.doesNotMatch(await tester.getScreenText(), /Old title/);
  });
});

test('cycles priority from medium through high, low, and medium', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Rotate priority');

    await key(tester, 'p');
    await tester.waitForText('[HIGH] Rotate priority');
    await key(tester, 'p');
    await tester.waitForText('[LOW] Rotate priority');
    await key(tester, 'p');
    await tester.waitForText('[MED] Rotate priority');
  });
});

test('deletes the selected row with d', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Remove me');
    await key(tester, 'd');
    await tester.waitForText('(no tasks yet)');
    assert.doesNotMatch(await tester.getScreenText(), /Remove me/);
  });
});

test('deletes the selected row with Backspace', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Backspace target');
    await tester.sendKey('Backspace');
    await tester.waitForText('(no tasks yet)');
    assert.doesNotMatch(await tester.getScreenText(), /Backspace target/);
  });
});

test('Tab filters pending and completed tasks and cycles back to all', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Completed item');
    await key(tester, 'Space');
    await key(tester, 'a');
    await enter(tester, 'Pending item');

    await key(tester, 'Tab');
    await tester.waitForText('[Pending]');
    await tester.waitForText('Pending item');
    assert.doesNotMatch(await tester.getScreenText(), /Completed item/);

    await key(tester, 'Tab');
    await tester.waitForText('[Done]');
    await tester.waitForText('Completed item');
    assert.doesNotMatch(await tester.getScreenText(), /Pending item/);

    await key(tester, 'Tab');
    await tester.waitForText('[All]');
    await tester.waitForText('Pending item');
    await tester.waitForText('Completed item');
  });
});

test('slash search matches titles without regard to case and can be cleared', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Write release notes');
    await key(tester, 'a');
    await enter(tester, 'Fix login');

    await key(tester, '/');
    await tester.waitForText('Search:');
    await enter(tester, 'RELEASE');
    await tester.waitForText('Write release notes');
    assert.doesNotMatch(await tester.getScreenText(), /Fix login/);

    await key(tester, '/');
    await enter(tester, 'missing');
    await tester.waitForText('(no tasks yet)');

    await key(tester, '/');
    await enter(tester, '');
    await tester.waitForText('Write release notes');
    await tester.waitForText('Fix login');
  });
});

test('j/k and arrow keys move the selection and clamp at list bounds', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'First');
    await key(tester, 'a');
    await enter(tester, 'Second');

    await key(tester, 'k');
    await tester.waitForText('> [ ] [MED] First');
    await tester.sendKey('Down');
    await tester.waitForText('> [ ] [MED] Second');
    await tester.sendKey('Up');
    await tester.waitForText('> [ ] [MED] First');
    await key(tester, 'j');
    await tester.waitForText('> [ ] [MED] Second');
  });
});

test('clears completed tasks while preserving pending tasks', async () => {
  await withApp(async (tester) => {
    await key(tester, 'a');
    await enter(tester, 'Completed');
    await key(tester, 'Space');
    await key(tester, 'a');
    await enter(tester, 'Still pending');

    await key(tester, 'c');
    await tester.waitForText('Still pending');
    assert.doesNotMatch(await tester.getScreenText(), /Completed/);
    await tester.waitForText('1 pending • 0 completed');
  });
});

test('persists tasks across a fresh application process', async () => {
  let tester = await startApp();
  try {
    await key(tester, 'a');
    await enter(tester, 'Persist this task');
    await tester.stop();

    tester = await startApp({ resetStore: false });
    await tester.waitForText('> [ ] [MED] Persist this task');
  } finally {
    await tester.stop();
  }
});

test('starts safely with an older serialized object in the store', async () => {
  fs.rmSync(dataDirectory, { recursive: true, force: true });
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.copyFileSync('/app/tests/fixtures/4f8b2d61.bin', dataFile);

  const tester = await startApp({ resetStore: false });
  try {
    await tester.waitForText('(no tasks yet)');
  } finally {
    await tester.stop();
  }
});
