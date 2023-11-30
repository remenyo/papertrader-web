import Big from 'big.js';

const OrderType = {
	MARKET: 'market',
	LIMIT: 'limit',
};

const OrderStatus = {
	PENDING: 'pending',
	EXECUTED: 'executed',
};

class Order {
	constructor({ id, type, amount, price, timestamp }) {
		this.id = id;
		this.type = type;
		this.amount = new Big(amount);
		this.price = price ? new Big(price) : null;
		this.timestamp = timestamp;
		this.status = OrderStatus.PENDING;
		this.executionPrice = null;
	}

	setExecutionPrice(price) {
		this.executionPrice = new Big(price);
		if (this.price === null) {
			this.price = new Big(price);
		}
	}
}

class Candle {
	constructor({ timestamp, open, high, low, close }) {
		this.timestamp = timestamp;
		this.open = new Big(open);
		this.high = new Big(high);
		this.low = new Big(low);
		this.close = new Big(close);
	}
}

class TradingSimulator {
	constructor(historicalData) {
		this.historicalData = historicalData.map(data => new Candle(data));
		this.orders = [];
		this.lastProcessedTimestamp = historicalData[0]?.timestamp || 0;
		this.foreignCurrencyBalance = new Big(0);
		this.autoStepInterval = null;
	}

	goLong() {
		let netPosition = this.calculateNetPosition();
		if (netPosition.lt(0)) {
			// If currently short, close the position before going long
			this.closePosition();
		}
		// Open a new long position only if the current position is not already long
		if (!netPosition.eq(1)) {
			this.placeOrder({
				type: OrderType.MARKET,
				amount: 1,
				timestamp: this.lastProcessedTimestamp,
			});
		}
	}

	goShort() {
		let netPosition = this.calculateNetPosition();
		if (netPosition.gt(0)) {
			// If currently long, close the position before going short
			this.closePosition();
		}
		// Open a new short position only if the current position is not already short
		if (!netPosition.eq(-1)) {
			this.placeOrder({
				type: OrderType.MARKET,
				amount: -1,
				timestamp: this.lastProcessedTimestamp,
			});
		}
	}

	closePosition() {
		let netPosition = this.calculateNetPosition();
		if (!netPosition.eq(0)) {
			// Close position only if there is an open position
			this.placeOrder({
				type: OrderType.MARKET,
				amount: -netPosition, // The amount needed to neutralize the position
				timestamp: this.lastProcessedTimestamp,
			});
		}
	}

	placeOrder({ type, amount, price, timestamp }) {
		const order = new Order({
			id: this.orders.length + 1,
			type,
			amount,
			price,
			timestamp
		});
		this.orders.push(order);
	}

	executeOrder(order) {
		const executionPrice = this.getCurrentPrice();
		order.setExecutionPrice(executionPrice);
		order.status = OrderStatus.EXECUTED;
		this.updateBalance(order.amount, executionPrice);
	}

	updateBalance(amount, price) {
		let transactionValue = price.times(amount);
		if (amount.gt(0)) {
			let potentialBalance = this.foreignCurrencyBalance.minus(transactionValue);
			this.foreignCurrencyBalance = potentialBalance.gt(-1) ? potentialBalance : new Big(-1);
		} else {
			let potentialBalance = this.foreignCurrencyBalance.plus(transactionValue.abs());
			this.foreignCurrencyBalance = potentialBalance.lt(1) ? potentialBalance : new Big(1);
		}
	}

	startAutoStep(intervalMs, updateCallback) {
		// Stop any existing interval to avoid multiple intervals running simultaneously
		this.stopAutoStep();

		// Set up an interval to step through candles
		this.autoStepInterval = setInterval(() => {
			// Find the next candle based on the last processed timestamp
			const nextCandle = this.historicalData.find(candle => candle.timestamp > this.lastProcessedTimestamp);
			if (nextCandle) {
				// Step to the timestamp of the next candle
				this.stepToTimestamp({
					targetTimestamp: nextCandle.timestamp,
					callback: () => {
						// Execute the update callback after stepping to the new timestamp
						if (updateCallback) {
							updateCallback();
						}
					},
				});
			} else {
				// If there are no more candles, stop the auto-stepping
				this.stopAutoStep();
			}
		}, intervalMs);
	}

	calculateNetPosition() {
		let netPosition = new Big(0);
		this.orders.forEach(order => {
			if (order.status === OrderStatus.EXECUTED) {
				netPosition = netPosition.plus(order.amount);
			}
		});
		return netPosition;
	}

	getCurrentPrice() {
		const lastCandle = this.historicalData.find(
			candle => candle.timestamp === this.lastProcessedTimestamp
		);
		return lastCandle ? lastCandle.close : new Big(0);
	}

	stepToNextCandle(callback) {
		const nextTimestamp = this.historicalData.find(
			candle => candle.timestamp > this.lastProcessedTimestamp
		)?.timestamp;

		if (nextTimestamp) {
			this.stepToTimestamp({
				targetTimestamp: nextTimestamp,
				callback: () => {
					if (callback) callback();
				},
			});
		} else {
			this.stopAutoStep();
		}
	}

	calculateTotalPnL() {
		let realizedPnL = new Big(0);
		let unrealizedPnL = new Big(0);
		const currentMarketPrice = this.getCurrentPrice();

		this.orders.forEach(order => {
			if (order.status === OrderStatus.EXECUTED) {
				const executionValue = order.executionPrice.times(order.amount.abs());
				if (order.amount.gt(0)) {
					// Buy order
					realizedPnL = realizedPnL.minus(executionValue);
				} else {
					// Sell order
					realizedPnL = realizedPnL.plus(executionValue);
				}
			}
		});

		// Calculate unrealized PnL for open positions
		const netPosition = this.calculateNetPosition();
		if (!netPosition.eq(0)) {
			const openPositionValue = currentMarketPrice.times(netPosition.abs());
			if (netPosition.gt(0)) {
				// Net position is long
				unrealizedPnL = openPositionValue.minus(this.foreignCurrencyBalance.abs());
			} else {
				// Net position is short
				unrealizedPnL = this.foreignCurrencyBalance.abs().minus(openPositionValue);
			}
		}

		const totalPnL = realizedPnL.plus(unrealizedPnL);
		return totalPnL.toFixed(2);
	}

	stepToTimestamp({ targetTimestamp, callback }) {
		const relevantCandles = this.historicalData.filter(candle =>
			candle.timestamp > this.lastProcessedTimestamp && candle.timestamp <= targetTimestamp
		);

		this.stepThroughCandles(relevantCandles, callback);
	}

	stepThroughCandles(candles, callback) {
		candles.forEach(candle => {
			this.orders.forEach(order => {
				if (order.status === OrderStatus.PENDING) {
					if (order.type === OrderType.LIMIT &&
						((order.amount.gt(0) && candle.low.lte(order.price)) ||
							(order.amount.lt(0) && candle.high.gte(order.price)))) {
						order.status = OrderStatus.EXECUTED;
						order.executionPrice = order.price;
					}

					if (order.type === OrderType.MARKET) {
						order.status = OrderStatus.EXECUTED;
						order.executionPrice = candle.close;
					}
				}
			});

			this.lastProcessedTimestamp = candle.timestamp;
			if (callback) {
				callback(candle, this.orders);
			}
		});
	}

	stopAutoStep() {
		if (this.autoStepInterval) {
			clearInterval(this.autoStepInterval);
			this.autoStepInterval = null;
		}
	}

	getOrders() {
		return this.orders.map(order => ({
			id: order.id,
			type: order.type,
			amount: order.amount.toString(),
			price: order.price ? order.price.toString() : null,
			timestamp: order.timestamp,
			status: order.status,
			executionPrice: order.executionPrice ? order.executionPrice.toString() : null,
		}));
	}

	exportState() {
		return JSON.stringify({
			historicalData: this.historicalData.map(candle => ({
				timestamp: candle.timestamp,
				open: candle.open.toString(),
				high: candle.high.toString(),
				low: candle.low.toString(),
				close: candle.close.toString(),
			})),
			orders: this.getOrders(),
			lastProcessedTimestamp: this.lastProcessedTimestamp
		});
	}

	importState(serializedState) {
		const state = JSON.parse(serializedState);
		this.historicalData = state.historicalData.map(data => new Candle(data));
		this.orders = state.orders.map(orderData => new Order(orderData));
		this.lastProcessedTimestamp = state.lastProcessedTimestamp;
	}
}

export { OrderType, OrderStatus, TradingSimulator };
