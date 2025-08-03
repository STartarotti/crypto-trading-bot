import { Strategy, Signal, Candle } from "../strategies/Strategy";

export interface DemoPosition {
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentValue: number;
}

export interface DemoTrade {
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    timestamp: Date;
    value: number;
}

export class DemoTrader {
    private balance: number;
    private positions: Map<string, DemoPosition> = new Map();
    private trades: DemoTrade[] = [];
    private initialBalance: number;

    constructor(initialBalance: number = 10000) {
        this.balance = initialBalance;
        this.initialBalance = initialBalance;
    }

    async executeTrade(
        signal: Signal,
        symbol: string,
        currentPrice: number
    ): Promise<boolean> {
        try {
            if (signal.type === "BUY") {
                return await this.demoMarketBuy(symbol, currentPrice);
            } else if (signal.type === "SELL") {
                return await this.demoMarketSell(symbol, currentPrice);
            }
            return false;
        } catch (error) {
            console.error("❌ Demo trade execution error:", error);
            return false;
        }
    }

    private async demoMarketBuy(
        symbol: string,
        price: number
    ): Promise<boolean> {
        const tradeValue = this.balance * 0.95; // Use 95% of available balance
        if (tradeValue < 10) {
            console.log("⚠️ Insufficient balance for trade");
            return false;
        }

        const quantity = tradeValue / price;

        // Update position
        const existingPosition = this.positions.get(symbol);
        if (existingPosition) {
            const totalQuantity = existingPosition.quantity + quantity;
            const averagePrice =
                (existingPosition.quantity * existingPosition.averagePrice +
                    quantity * price) /
                totalQuantity;

            this.positions.set(symbol, {
                symbol,
                quantity: totalQuantity,
                averagePrice,
                currentValue: totalQuantity * price,
            });
        } else {
            this.positions.set(symbol, {
                symbol,
                quantity,
                averagePrice: price,
                currentValue: quantity * price,
            });
        }

        this.balance -= tradeValue;
        this.trades.push({
            symbol,
            side: "BUY",
            quantity,
            price,
            timestamp: new Date(),
            value: tradeValue,
        });

        console.log(
            `🟢 DEMO BUY: ${quantity.toFixed(6)} ${symbol} at $${price.toFixed(
                2
            )} | Value: $${tradeValue.toFixed(2)}`
        );
        return true;
    }

    private async demoMarketSell(
        symbol: string,
        price: number
    ): Promise<boolean> {
        const position = this.positions.get(symbol);
        if (!position || position.quantity <= 0) {
            console.log("⚠️ No position to sell");
            return false;
        }

        const saleValue = position.quantity * price;
        this.balance += saleValue;

        this.trades.push({
            symbol,
            side: "SELL",
            quantity: position.quantity,
            price,
            timestamp: new Date(),
            value: saleValue,
        });

        console.log(
            `🔴 DEMO SELL: ${position.quantity.toFixed(
                6
            )} ${symbol} at $${price.toFixed(2)} | Value: $${saleValue.toFixed(
                2
            )}`
        );

        this.positions.delete(symbol);
        return true;
    }

    getPortfolioValue(currentPrices: Map<string, number>): number {
        let totalValue = this.balance;

        for (const [symbol, position] of this.positions) {
            const currentPrice =
                currentPrices.get(symbol) || position.averagePrice;
            totalValue += position.quantity * currentPrice;
        }

        return totalValue;
    }

    getPerformanceStats(currentPrices: Map<string, number>): any {
        const currentValue = this.getPortfolioValue(currentPrices);
        const totalReturn =
            ((currentValue - this.initialBalance) / this.initialBalance) * 100;

        return {
            initialBalance: this.initialBalance,
            currentBalance: this.balance,
            currentValue,
            totalReturn,
            totalTrades: this.trades.length,
            positions: Array.from(this.positions.values()),
        };
    }
}
