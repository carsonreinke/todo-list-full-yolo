import { createTester } from 'tui-tester';
import { test, beforeEach, afterEach } from 'node:test';
import fs from 'fs';

test('todo', async (t) => {
  let tester;

  await beforeEach(async () => {
    fs.rmSync('/app/tests/.data', { recursive: true, force: true });
    fs.mkdirSync('/app/tests/.data');

    tester = new createTester(`stty raw -echo opost onlcr; java -Dtodo.data=/app/tests/.data/6c2a9f31.bin -cp /app TodoApp`, {
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

  const enter = async (text) => {
    await tester.sendText(text);
    await tester.sendKey('Enter');
  };
  const key = async (value) => value === 'Space' ? tester.sendKey('space') : tester.sendKey(value);

  await test('supports core task actions and binary persistence', async (t) => {
    await tester.waitForText('📝 TODO LIST');
    await tester.waitForText('Space: Toggle');

    await key('a');
    await tester.waitForText('New task:');
    await enter('Write release notes');
    await tester.waitForText('> [ ] [MED] Write release notes');
    await tester.waitForText('1 pending • 0 completed');

    await key('Space');
    await tester.waitForText('> [x] [MED] Write release notes');
    await tester.waitForText('0 pending • 1 completed');

    await key('e');
    await tester.waitForText('Edit task:');
    await enter('Publish release notes');
    await tester.waitForText('> [x] [MED] Publish release notes');

    await key('p');
    await tester.waitForText('> [x] [HIGH] Publish release notes');
    await key('Tab');
    await tester.waitForText('[Pending]');
    await tester.waitForText('(no tasks yet)');
    await key('Tab');
    await tester.waitForText('[Done]');
    await tester.waitForText('Publish release notes');
    await key('Tab');
    await tester.waitForText('[All]');
    await key('d');
    await tester.waitForText('(no tasks yet)');

    await key('a');
    await enter('Keep pending');
    await key('a');
    await enter('Remove completed');
    await tester.waitForText('> [ ] [MED] Keep pending');

    await key('Tab');
    await tester.waitForText('[Pending]');
    await tester.waitForText('Keep pending');
    await key('Tab');
    await tester.waitForText('[Done]');
    await tester.waitForText('(no tasks yet)');
    await key('Tab');
    await tester.waitForText('[All]');

    await key('/');
    await tester.waitForText('Search:');
    await enter('Keep');
    await tester.waitForText('Keep pending');
    await key('/');
    await enter('');

    await tester.sendKey('Down');
    await tester.waitForText('> [ ] [MED] Remove completed');
    await tester.sendKey('Up');
    await tester.waitForText('> [ ] [MED] Keep pending');

    await key('j');
    await tester.waitForText('> [ ] [MED] Remove completed');
    await key('k');
    await tester.waitForText('> [ ] [MED] Keep pending');
    await key('Space');
    await tester.waitForText('> [x] [MED] Keep pending');

    await key('c');
    await tester.waitForText('> [ ] [MED] Remove completed');
    await tester.sendKey('Escape');

    await tester.stop();
    tester = new createTester(`stty raw -echo opost onlcr; java -Dtodo.data=/app/tests/.data/6c2a9f31.bin -cp /app TodoApp`, {
      cols: 100,
      rows: 30
    });
    await tester.start();
    await tester.waitForText('📝 TODO LIST');
    await tester.waitForText('> [ ] [MED] Remove completed');
    await key('q');
  });

  await test('starts safely with an older serialized object in the store', async (t) => {
    await tester.stop();
    fs.copyFileSync('/app/tests/fixtures/4f8b2d61.bin', '/app/tests/.data/6c2a9f31.bin');

    tester = new createTester(`stty raw -echo opost onlcr; java -Dtodo.data=/app/tests/.data/6c2a9f31.bin -cp /app TodoApp`, {
      cols: 100,
      rows: 30
    });
    await tester.start();
    await tester.waitForText('📝 TODO LIST');
    await tester.waitForText('(no tasks yet)');
    await key('q');
  });
});
