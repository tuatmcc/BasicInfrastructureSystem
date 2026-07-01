import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventDetailHref, getEventMessageTitle } from './eventUtils';

test('buildEventDetailHref returns the selectable event detail route', () => {
  assert.equal(buildEventDetailHref('event-123'), '/event/event-123');
});

test('getEventMessageTitle uses the first line and falls back for empty content', () => {
  assert.equal(getEventMessageTitle('夏合宿の参加確認\n詳細本文'), '夏合宿の参加確認');
  assert.equal(getEventMessageTitle(''), 'イベント通知メッセージ');
});
