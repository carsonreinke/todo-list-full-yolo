import { createTester } from 'tui-tester';
import { test, beforeEach, afterEach } from 'node:test';

test('todo', async (t) => {
  let tester;

  await beforeEach(async () => {
    tester = new createTester('java -cp /app q7m4v2x9', {
      cols: 100,
      rows: 30,
      debug: true
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