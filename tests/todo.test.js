import { createTester } from 'tui-tester';
import { test, beforeEach, afterEach } from 'node:test';
import fs from 'fs';

test('todo', async (t) => {
  let tester;

  await beforeEach(async () => {
    fs.rmSync('/app/tests/.data', { recursive: true, force: true });
    fs.mkdirSync('/app/tests/.data');

    tester = new createTester('java -Dtodo.data=/app/tests/.data/6c2a9f31.bin -cp /app TodoApp', {
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

  await test('supports core task actions and binary persistence', async (t) => {
    await tester.waitForText('📝 TODO LIST');
    await tester.waitForText('Space/Enter: Toggle');

    await enter('a');
    await tester.waitForText('Task text:');
    await enter('Write release notes');
    await tester.waitForText('> 0: [ ] [MED] Write release notes');

    await enter('t');
    await tester.waitForText('> 0: [x] [MED] Write release notes');

    await enter('e');
    await tester.waitForText('Task text:');
    await enter('Publish release notes');
    await tester.waitForText('> 0: [x] [MED] Publish release notes');

    await enter('p');
    await tester.waitForText('> 0: [x] [HIGH] Publish release notes');
    await enter('g');
    await tester.waitForText('Tag:');
    await enter('release');
    await tester.waitForText('> 0: [x] [HIGH] Publish release notes #release');
    await enter('d');
    await tester.waitForText('(no tasks yet)');

    await enter('a');
    await enter('Keep pending');
    await enter('a');
    await enter('Remove completed');
    await tester.waitForText('> 1: [ ] [MED] Remove completed');

    await enter('k');
    await tester.waitForText('> 0: [ ] [MED] Keep pending');
    await enter(' ');
    await tester.waitForText('> 0: [x] [MED] Keep pending');

    await enter('c');
    await tester.waitForText('> 0: [ ] [MED] Remove completed');
    await enter('q');

    await tester.stop();
    tester = new createTester('java -Dtodo.data=/app/tests/.data/6c2a9f31.bin -cp /app TodoApp', {
      cols: 100,
      rows: 30
    });
    await tester.start();
    await tester.waitForText('📝 TODO LIST');
    await tester.waitForText('> 0: [ ] [MED] Remove completed');
    await enter('q');
  });

  await test('starts safely with an older serialized object in the store', async (t) => {
    await tester.stop();
    fs.copyFileSync('/app/tests/fixtures/4f8b2d61.bin', '/app/tests/.data/6c2a9f31.bin');

    tester = new createTester('java -Dtodo.data=/app/tests/.data/6c2a9f31.bin -cp /app TodoApp', {
      cols: 100,
      rows: 30
    });
    await tester.start();
    await tester.waitForText('📝 TODO LIST');
    await tester.waitForText('(no tasks yet)');
    await enter('q');
  });
});
