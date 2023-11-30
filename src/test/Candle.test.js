// Candle.test.js
import { describe, it, expect } from 'vitest';
import { Candle } from '../TradingSimulator';

describe('Candle', () => {
	it('should create a Candle with correct properties', () => {
		const candle = new Candle({
			timestamp: 1234567890,
			open: 100,
			high: 105,
			low: 95,
			close: 102
		});

		expect(candle.timestamp).toBe(1234567890);
		expect(candle.open.toString()).toBe('100');
		expect(candle.high.toString()).toBe('105');
		expect(candle.low.toString()).toBe('95');
		expect(candle.close.toString()).toBe('102');
	});
});
