import { Strategy, Signal, Candle } from "../strategies/Strategy";

export interface Trade {
    type: "BUY" | "SELL";
    price: number;
    timestamp: Date;
    quantity: number;
}

export interface BacktestResult {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: Trade[];
}

export class Backtester {
    private initialBalance: number;
    private currentBalance: number;
    private position: number = 0; // Amount of crypto held
    private trades: Trade[] = [];
    private maxBalance: number;

    constructor(initialBalance: number = 10000) {
        this.initialBalance = initialBalance;
        this.currentBalance = initialBalance;
        this.maxBalance = initialBalance;
    }

    async backtest(
        strategy: Strategy,
        candles: Candle[]
    ): Promise<BacktestResult> {
        console.log(`\n🚀 Starting backtest for ${strategy.getName()}`);
        console.log(`📊 Parameters:`, strategy.getParameters());
        console.log(`💰 Initial balance: $${this.initialBalance}`);
        console.log(`📈 Analyzing ${candles.length} candles...\n`);

        this.reset();

        for (
            let i = strategy.getParameters().longPeriod || 20;
            i < candles.length;
            i++
        ) {
            const historicalCandles = candles.slice(0, i + 1);
            const signal = strategy.analyze(historicalCandles);

            // Debug every signal
            if (signal.type !== "HOLD") {
                console.log(
                    `📡 Signal generated: ${
                        signal.type
                    } at ${signal.price.toFixed(
                        2
                    )} with confidence ${signal.confidence.toFixed(3)}`
                );
            }

            if (signal.type !== "HOLD" && signal.confidence > 0.1) {
                // Lowered threshold
                this.executeSignal(signal, candles[i]);
            }

            // Show progress every 200 candles
            if (i % 200 === 0) {
                const currentPrice = candles[i].close;
                const totalValue = this.getTotalValue(currentPrice);
                const returnPercent =
                    ((totalValue - this.initialBalance) / this.initialBalance) *
                    100;
                console.log(
                    `📊 Progress: ${i}/${
                        candles.length
                    } candles | Current value: ${totalValue.toFixed(
                        2
                    )} (${returnPercent.toFixed(2)}%)`
                );
            }
        }

        // Close any remaining position
        if (this.position > 0) {
            const lastCandle = candles[candles.length - 1];
            this.executeSignal(
                {
                    type: "SELL",
                    price: lastCandle.close,
                    timestamp: lastCandle.timestamp,
                    confidence: 1,
                },
                lastCandle
            );
        }

        return this.calculateResults();
    }

    private executeSignal(signal: Signal, candle: Candle): void {
        const price = signal.price;

        console.log(
            `🔍 Attempting to execute ${signal.type} signal at ${price.toFixed(
                2
            )} with confidence ${signal.confidence.toFixed(3)}`
        );
        console.log(
            `💼 Current state - Balance: ${this.currentBalance.toFixed(
                2
            )}, Position: ${this.position.toFixed(6)}`
        );

        if (
            signal.type === "BUY" &&
            this.currentBalance > 100 &&
            this.position === 0
        ) {
            // Minimum $100 to trade
            // Buy with 95% of available balance (leaving some for fees)
            const quantity = (this.currentBalance * 0.95) / price;
            this.position = quantity;
            this.currentBalance = this.currentBalance * 0.05; // Keep 5% as cash

            this.trades.push({
                type: "BUY",
                price,
                timestamp: signal.timestamp,
                quantity,
            });

            console.log(
                `🟢 BUY EXECUTED: ${quantity.toFixed(6)} at ${price.toFixed(
                    2
                )} | Total Value: ${this.getTotalValue(price).toFixed(2)}`
            );
        } else if (signal.type === "SELL" && this.position > 0) {
            const saleValue = this.position * price;
            this.currentBalance += saleValue;

            this.trades.push({
                type: "SELL",
                price,
                timestamp: signal.timestamp,
                quantity: this.position,
            });

            console.log(
                `🔴 SELL EXECUTED: ${this.position.toFixed(
                    6
                )} at ${price.toFixed(
                    2
                )} | New Balance: ${this.currentBalance.toFixed(2)}`
            );

            this.position = 0;
            this.maxBalance = Math.max(this.maxBalance, this.currentBalance);
        } else {
            console.log(`❌ Trade NOT executed - Conditions not met`);
            if (signal.type === "BUY") {
                console.log(
                    `   - Need balance > $100 (have ${this.currentBalance.toFixed(
                        2
                    )}) and position = 0 (have ${this.position.toFixed(6)})`
                );
            }
            if (signal.type === "SELL") {
                console.log(
                    `   - Need position > 0 (have ${this.position.toFixed(6)})`
                );
            }
        }
    }

    private getTotalValue(currentPrice: number): number {
        return this.currentBalance + this.position * currentPrice;
    }

    private reset(): void {
        this.currentBalance = this.initialBalance;
        this.position = 0;
        this.trades = [];
        this.maxBalance = this.initialBalance;
    }

    private calculateResults(): BacktestResult {
        const buyTrades = this.trades.filter((t) => t.type === "BUY");
        const sellTrades = this.trades.filter((t) => t.type === "SELL");

        let winningTrades = 0;
        let losingTrades = 0;

        // Match buy/sell pairs to calculate wins/losses
        for (
            let i = 0;
            i < Math.min(buyTrades.length, sellTrades.length);
            i++
        ) {
            if (sellTrades[i].price > buyTrades[i].price) {
                winningTrades++;
            } else {
                losingTrades++;
            }
        }

        const totalReturn =
            ((this.currentBalance - this.initialBalance) /
                this.initialBalance) *
            100;
        const maxDrawdown =
            ((this.maxBalance - this.currentBalance) / this.maxBalance) * 100;
        const winRate =
            buyTrades.length > 0 ? (winningTrades / buyTrades.length) * 100 : 0;

        return {
            totalTrades: buyTrades.length,
            winningTrades,
            losingTrades,
            winRate,
            totalReturn,
            maxDrawdown,
            sharpeRatio: 0, // Simplified - would need more complex calculation
            trades: this.trades,
        };
    }
}
