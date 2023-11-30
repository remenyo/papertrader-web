// BalanceTracker.test.js
import { describe, it, expect } from 'vitest';
import { BalanceTracker, Order, OrderType } from '../TradingSimulator';

describe('BalanceTracker', () => {
	it('should update PnL correctly on order execution', () => {
		const balanceTracker = new BalanceTracker();
		const executedOrder = new Order({
			id: 1,
			type: OrderType.MARKET,
			amount: 10,
			price: 100,
			timestamp: 1234567890
		});
		executedOrder.status = 'executed';
		executedOrder.setExecutionPrice(100); // Use the setter to ensure correct type

		balanceTracker.updateOnOrderExecution(executedOrder);

		expect(balanceTracker.getPnL()).toBe('-1000'); // Check if PnL calculation is correct
	});
});
