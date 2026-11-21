import { createTester } from 'tui-tester';
import { test, beforeEach, afterEach } from 'node:test';
import fs from 'fs';

test('todo', async (t) => {
  let tester;

  await beforeEach(async () => {
    fs.rmSync('/app/tests/.data', { recursive: true, force: true });
    fs.mkdirSync('/app/tests/.data');

    tester = new createTester('java -cp /app q7m4v2x9', {
      cols: 100,
      rows: 30
    });
    await tester.start();
  });

  await afterEach(async () => {
    if (tester) {
      await tester.stop();
    }
  });

  await test('quitting', async (t) => {
    await tester.waitForText('[a] add  [l] list  [t] toggle  [e] edit  [d] delete  [p] priority  [g] tag  [c] clear  [q] quit');
    await tester.sendText('q');
  });
});