<template>
  <div>
    <h1>Trading Simulator Game</h1>
    <p>Current Price: {{ currentPrice }}</p>
    <p>P&L: {{ pnlPercentage }}</p>
    <button @click="goLong">Long</button>
    <button @click="goShort">Short</button>
    <button @click="exitMarket">Exit Market</button>
    <button @click="toggleAutoStep">{{ isRunning ? "Pause" : "Start" }}</button>
    <div v-if="simulatorState.isReady">
      <h2>Orders</h2>
      <ul>
        <li v-for="order in orders" :key="order.id">
          ID: {{ order.id }}, Type: {{ order.type }}, Amount:
          {{ order.amount }}, Status: {{ order.status }}, Execution Price:
          {{ order.executionPrice }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from "vue";
import { TradingSimulator } from "./TradingSimulator";
import { dataset } from "./dataset";
import Papa from "papaparse";

export default {
  setup() {
    const currentPrice = ref(0);
    const isRunning = ref(false);
    const simulatorState = reactive({
      simulator: null,
      isReady: false,
    });

    const orders = computed(() => {
      return simulatorState.isReady ? simulatorState.simulator.getOrders() : [];
    });

    const pnlPercentage = computed(() => {
      return simulatorState.isReady
        ? simulatorState.simulator.calculateTotalPnL()
        : "0%";
    });

    function transformData(data) {
      return data.map((row) => ({
        timestamp: parseInt(row.Unix),
        open: parseFloat(row.Open),
        high: parseFloat(row.High),
        low: parseFloat(row.Low),
        close: parseFloat(row.Close),
      }));
    }

    Papa.parse(dataset, {
      header: true,
      complete: (results) => {
        const transformedData = transformData(results.data);
        simulatorState.simulator = new TradingSimulator(transformedData);
        simulatorState.isReady = true;
      },
    });

    const updateGame = () => {
      if (simulatorState.isReady) {
        const lastCandle = simulatorState.simulator.historicalData.find(
          (candle) =>
            candle.timestamp === simulatorState.simulator.lastProcessedTimestamp
        );
        currentPrice.value = lastCandle ? lastCandle.close.toString() : "0";
      }
    };

    const goLong = () => {
      if (simulatorState.isReady) {
        simulatorState.simulator.goLong();
        updateGame();
      }
    };

    const goShort = () => {
      if (simulatorState.isReady) {
        simulatorState.simulator.goShort();
        updateGame();
      }
    };

    const exitMarket = () => {
      if (simulatorState.isReady) {
        simulatorState.simulator.closePosition();
        updateGame();
      }
    };

    const toggleAutoStep = () => {
      if (isRunning.value) {
        simulatorState.simulator.stopAutoStep();
      } else {
        simulatorState.simulator.startAutoStep(1000, updateGame);
      }
      isRunning.value = !isRunning.value;
    };

    return {
      currentPrice,
      goLong,
      goShort,
      exitMarket,
      toggleAutoStep,
      isRunning,
      orders,
      simulatorState,
      pnlPercentage,
    };
  },
};
</script>
