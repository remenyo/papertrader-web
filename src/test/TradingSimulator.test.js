import { describe, it, expect } from 'vitest';
import { TradingSimulator, OrderType } from '../TradingSimulator';

describe('TradingSimulator', () => {
	const historicalData = [
		{ timestamp: 1234567890, open: 100, high: 105, low: 95, close: 102 },
		{ timestamp: 1234567900, open: 102, high: 106, low: 98, close: 104 },
		// ... add more data as needed
	];

	// Test for Order Placement
	it('should correctly place an order', () => {
		const simulator = new TradingSimulator(historicalData);
		simulator.placeOrder({
			type: OrderType.MARKET,
			amount: 10,
			timestamp: 1234567890
		});

		expect(simulator.getOrders()).toHaveLength(1);
		const placedOrder = simulator.getOrders()[0];
		expect(placedOrder.type).toBe(OrderType.MARKET);
		expect(placedOrder.amount.toString()).toBe('10');
		expect(placedOrder.timestamp).toBe(1234567890);
	});

	// Test for Order Execution
	it('should execute a market order correctly', () => {
		const simulator = new TradingSimulator(historicalData);
		simulator.placeOrder({
			type: OrderType.MARKET,
			amount: 5,
			timestamp: 1234567890
		});

		simulator.stepToTimestamp({ targetTimestamp: 1234567900, callback: () => { } });

		const executedOrder = simulator.getOrders()[0];
		expect(executedOrder.status).toBe('executed');
		expect(executedOrder.executionPrice.toString()).toBe('102'); // Assuming execution at the close price of the first candle
	});

	// Test for Stepping Through Candles
	it('should step through candles correctly', () => {
		const simulator = new TradingSimulator(historicalData);
		simulator.stepToTimestamp({ targetTimestamp: 1234567900, callback: () => { } });

		expect(simulator.lastProcessedTimestamp).toBe(1234567900);
		const lastCandle = historicalData.find(c => c.timestamp === simulator.lastProcessedTimestamp);
		expect(lastCandle).toBeDefined();
		expect(lastCandle.close.toString()).toBe('104'); // Assuming the last processed candle is the second one
	});

	// Test for PnL Calculation
	it('should calculate PnL correctly', () => {
		const simulator = new TradingSimulator(historicalData);
		simulator.placeOrder({
			type: OrderType.MARKET,
			amount: 5,
			timestamp: 1234567890
		});

		simulator.stepToTimestamp({ targetTimestamp: 1234567900, callback: () => { } });

		const pnl = parseFloat(simulator.balanceTracker.getPnL());
		const expectedPnL = (104 - 102) * 5; // Profit based on the price change from first to second candle
		expect(pnl).toBeCloseTo(expectedPnL, 2);
	});
});
