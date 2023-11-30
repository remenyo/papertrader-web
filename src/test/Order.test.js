// Order.test.js
import { describe, it, expect } from 'vitest';
import { Order, OrderType, OrderStatus } from '../TradingSimulator';

describe('Order', () => {
	it('should create an Order with correct properties', () => {
		const order = new Order({
			id: 1,
			type: OrderType.MARKET,
			amount: 10,
			price: 100,
			timestamp: 1234567890
		});

		expect(order.id).toBe(1);
		expect(order.type).toBe(OrderType.MARKET);
		expect(order.amount.toString()).toBe('10');
		expect(order.price.toString()).toBe('100');
		expect(order.timestamp).toBe(1234567890);
		expect(order.status).toBe(OrderStatus.PENDING);
		expect(order.executionPrice).toBeNull();
	});
});