import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBlockRange } from './blockRange.js';

test('uses the manual range when no activity overflows it', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Focení', casZacatku: '10:30', casKonce: '11:00' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '10:00');
  assert.equal(result.endLabel, '14:00');
  assert.equal(result.isExpanded, false);
  assert.deepEqual(result.expandedByNames, []);
});

test('expands the start when an activity starts earlier than the manual start', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Příprava', casZacatku: '09:15', casKonce: '09:45' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '09:15');
  assert.equal(result.endLabel, '14:00');
  assert.equal(result.isExpanded, true);
  assert.deepEqual(result.expandedByNames, ['Příprava']);
});

test('expands the end when an activity ends later than the manual end', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Přípitek', casZacatku: '13:30', casKonce: '14:45' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '10:00');
  assert.equal(result.endLabel, '14:45');
  assert.equal(result.isExpanded, true);
  assert.deepEqual(result.expandedByNames, ['Přípitek']);
});

test('expands both ends and names both causing activities', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [
    { nazev: 'Příprava', casZacatku: '09:00', casKonce: '09:30' },
    { nazev: 'Přípitek', casZacatku: '13:30', casKonce: '15:00' }
  ];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '09:00');
  assert.equal(result.endLabel, '15:00');
  assert.equal(result.isExpanded, true);
  assert.deepEqual(result.expandedByNames, ['Příprava', 'Přípitek']);
});

test('falls back to the activities range when the block has no manual time set', () => {
  const block = { id: 'b1', casZacatku: null, casKonce: null };
  const items = [
    { nazev: 'Obřad', casZacatku: '11:00', casKonce: '11:30' },
    { nazev: 'Gratulace', casZacatku: '11:30', casKonce: '12:00' }
  ];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '11:00');
  assert.equal(result.endLabel, '12:00');
  assert.equal(result.isExpanded, false);
});

test('does not report expansion when an activity exactly matches the manual bounds', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Oběd', casZacatku: '10:00', casKonce: '14:00' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.isExpanded, false);
});
