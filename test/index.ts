import * as assert from 'power-assert';
import beater from 'beater';
import { run } from '../src/';

const { test } = beater();

test('index', () => {
  assert(run);
});
