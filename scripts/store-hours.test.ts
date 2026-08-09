import assert from 'node:assert/strict';
import { getStoreStatus } from '../src/storeHours';

const at = (iso: string) => getStoreStatus(new Date(iso));

assert.equal(at('2026-08-10T05:59:00.000Z').open, false, 'closed before lunch');
assert.equal(at('2026-08-10T06:00:00.000Z').open, true, 'opens at 11:30 AM IST');
assert.equal(at('2026-08-10T08:29:00.000Z').open, true, 'open through lunch session');
assert.equal(at('2026-08-10T08:30:00.000Z').open, false, 'closes at 2:00 PM IST');
assert.match(at('2026-08-10T08:30:00.000Z').nextChange, /6:30 PM/);
assert.equal(at('2026-08-10T13:00:00.000Z').open, true, 'opens at 6:30 PM IST');
assert.equal(at('2026-08-10T15:29:00.000Z').open, true, 'open through dinner session');
assert.equal(at('2026-08-10T15:30:00.000Z').open, false, 'closes at 9:00 PM IST');
assert.match(at('2026-08-10T15:30:00.000Z').nextChange, /tomorrow at 11:30 AM/);

console.log('PASS store-hours boundaries and next-opening messages');
