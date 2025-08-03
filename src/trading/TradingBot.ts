import { Strategy, Candle } from "../strategies/Strategy";
import { BinanceClient } from "../exchanges/BinanceClient";
import { DemoTrader } from "./DemoTrader";
import { LiveTrader } from "./LiveTrader";

export interface BotConfig {
    symbol: string;
    strategy: Strategy;
    interval: string;
    tradeAmount: number;
    demoMode: boolean;
    riskManagement: {
        maxLossPercent: number;
        stopLossPercent: number;
    };
}

export class TradingBot {
    private config: BotConfig;
    private binanceClient: BinanceClient;
    private demoTrader: DemoTrader;
    private liveTrader: LiveTrader;
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private candleHistory: Candle[] = [];
    private startTime: Date | null = null;

    constructor(config: BotConfig, binanceClient: BinanceClient) {
        this.config = config;
        this.binanceClient = binanceClient;
        this.demoTrader = new DemoTrader(config.tradeAmount);
        this.liveTrader = new LiveTrader(binanceClient);
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log("⚠️ Bot is already running");
            return;
        }

        console.log(`🚀 Starting trading bot...`);
        console.log(`📊 Strategy: ${this.config.strategy.getName()}`);
        console.log(`💰 Symbol: ${this.config.symbol}`);
        console.log(`⏰ Interval: ${this.config.interval}`);
        console.log(`🎭 Mode: ${this.config.demoMode ? "DEMO" : "LIVE"}`);

        // Load initial historical data
        await this.loadHistoricalData();

        this.isRunning = true;

        this.startTime = new Date();

        // Start the trading loop
        this.intervalId = setInterval(async () => {
            await this.tradingLoop();
        }, this.getIntervalMs());

        console.log("✅ Trading bot started successfully");
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            console.log("⚠️ Bot is not running");
            return;
        }

        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log("🛑 Trading bot stopped");
        await this.printFinalStats();
    }

    private async loadHistoricalData(): Promise<void> {
        try {
            console.log("📚 Loading historical data...");
            this.candleHistory = await this.binanceClient.getHistoricalKlines(
                this.config.symbol,
                this.config.interval,
                200 // Load last 200 candles
            );
            console.log(
                `✅ Loaded ${this.candleHistory.length} historical candles`
            );
        } catch (error) {
            console.error("❌ Error loading historical data:", error);
            throw error;
        }
    }

    private async tradingLoop(): Promise<void> {
        try {
            // Get latest candle
            const latestCandles = await this.binanceClient.getHistoricalKlines(
                this.config.symbol,
                this.config.interval,
                1
            );

            if (latestCandles.length === 0) return;

            const latestCandle = latestCandles[0];

            // Update candle history
            this.candleHistory.push(latestCandle);
            // if (this.candleHistory.length > 200) {
            //     this.candleHistory = this.candleHistory.slice(-200); // Keep last 200 candles
            // }

            // Analyze with strategy
            const signal = this.config.strategy.analyze(this.candleHistory);

            if (signal.type !== "HOLD" && signal.confidence > 0.3) {
                console.log(
                    `📡 Signal detected: ${
                        signal.type
                    } at $${signal.price.toFixed(
                        2
                    )} (confidence: ${signal.confidence.toFixed(3)})`
                );

                // Execute trade
                const success = this.config.demoMode
                    ? await this.demoTrader.executeTrade(
                          signal,
                          this.config.symbol,
                          signal.price
                      )
                    : await this.liveTrader.executeTrade(
                          signal,
                          this.config.symbol,
                          this.config.tradeAmount
                      );

                if (success) {
                    console.log("✅ Trade executed successfully\n");
                } else {
                    console.log("❌ Trade execution failed\n");
                }
            }

            // Print periodic status
            if (
                this.startTime &&
                Date.now() - this.startTime.getTime() >= 300000
            ) {
                // Every 5 minutes
                this.startTime = new Date();
                await this.printStatus();
            }
        } catch (error) {
            console.error("❌ Error in trading loop:", error);
        }
    }

    private async printStatus(): Promise<void> {
        const currentPrice = await this.binanceClient.getCurrentPrice(
            this.config.symbol
        );

        if (this.config.demoMode) {
            const priceMap = new Map([[this.config.symbol, currentPrice]]);
            const stats = this.demoTrader.getPerformanceStats(priceMap);

            console.log(`\n📊 Demo Trading Status:`);
            console.log(
                `💰 Current Value: $${stats.currentValue.toFixed(
                    2
                )} (${stats.totalReturn.toFixed(2)}%)`
            );
            console.log(`📈 Total Trades: ${stats.totalTrades}`);
            console.log(`🏦 Cash Balance: $${stats.currentBalance.toFixed(2)}`);
            console.log(`📍 Current Price: $${currentPrice.toFixed(2)}`);
        } else {
            console.log(`\n📊 Live Trading Status:`);
            console.log(`📍 Current Price: $${currentPrice.toFixed(2)}`);
            console.log(
                `🔴 Live Mode: ${
                    this.liveTrader.isLiveActive() ? "ACTIVE" : "INACTIVE"
                }`
            );
        }
    }

    private async printFinalStats(): Promise<void> {
        if (this.config.demoMode) {
            const currentPrice = await this.binanceClient.getCurrentPrice(
                this.config.symbol
            );
            const priceMap = new Map([[this.config.symbol, currentPrice]]);
            const stats = this.demoTrader.getPerformanceStats(priceMap);

            console.log(`\n📈 Final Demo Trading Results:`);
            console.log(`💰 Final Value: $${stats.currentValue.toFixed(2)}`);
            console.log(`📊 Total Return: ${stats.totalReturn.toFixed(2)}%`);
            console.log(`🔄 Total Trades: ${stats.totalTrades}`);
        }
    }

    private getIntervalMs(): number {
        const intervalMap: Record<string, number> = {
            "1m": 60 * 1000,
            "5m": 5 * 60 * 1000,
            "15m": 15 * 60 * 1000,
            "1h": 60 * 60 * 1000,
            "4h": 4 * 60 * 60 * 1000,
            "1d": 24 * 60 * 60 * 1000,
        };

        return intervalMap[this.config.interval] || 60 * 1000; // Default to 1 minute
    }

    activateLiveTrading(): void {
        if (!this.config.demoMode) {
            this.liveTrader.activate();
        }
    }

    deactivateLiveTrading(): void {
        this.liveTrader.deactivate();
    }
}
