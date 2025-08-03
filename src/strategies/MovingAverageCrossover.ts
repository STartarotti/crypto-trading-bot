import { Strategy, Signal, Candle } from "./Strategy";
import { MAC } from "../config/parametersConfig.json";

export class MovingAverageCrossover extends Strategy {
    private shortPeriod: number;
    private longPeriod: number;
    private lastSignal: "BUY" | "SELL" | "HOLD" = "HOLD";

    constructor(
        shortPeriod: number = MAC.shortPeriod,
        longPeriod: number = MAC.longPeriod
    ) {
        super("Moving Average Crossover", { shortPeriod, longPeriod });
        this.shortPeriod = shortPeriod;
        this.longPeriod = longPeriod;
    }

    analyze(candles: Candle[]): Signal {
        if (candles.length < this.longPeriod) {
            return {
                type: "HOLD",
                price: candles[candles.length - 1].close,
                timestamp: candles[candles.length - 1].timestamp,
                confidence: 0,
            };
        }

        const shortMA = this.calculateMA(candles, this.shortPeriod);
        const longMA = this.calculateMA(candles, this.longPeriod);

        // Look at previous values to detect crossovers
        const prevCandles = candles.slice(0, -1);
        const prevShortMA = this.calculateMA(prevCandles, this.shortPeriod);
        const prevLongMA = this.calculateMA(prevCandles, this.longPeriod);

        const currentCandle = candles[candles.length - 1];
        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let confidence = 0;

        // Calculate the difference and percentage
        const currentSpread = (shortMA - longMA) / longMA;
        const prevSpread = (prevShortMA - prevLongMA) / prevLongMA;

        // Golden Cross: Short MA crosses above Long MA
        if (
            prevShortMA <= prevLongMA &&
            shortMA > longMA &&
            this.lastSignal !== "BUY"
        ) {
            signal = "BUY";
            confidence = Math.max(
                0.5,
                Math.min(0.9, Math.abs(currentSpread) * 50)
            );
            this.lastSignal = "BUY";
            console.log(
                `\n🎯 GOLDEN CROSS detected! Short MA: ${shortMA.toFixed(
                    2
                )}, Long MA: ${longMA.toFixed(
                    2
                )}, Confidence: ${confidence.toFixed(3)}`
            );
        }
        // Death Cross: Short MA crosses below Long MA
        else if (
            prevShortMA >= prevLongMA &&
            shortMA < longMA &&
            this.lastSignal !== "SELL"
        ) {
            signal = "SELL";
            confidence = Math.max(
                0.5,
                Math.min(0.9, Math.abs(currentSpread) * 50)
            );
            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ DEATH CROSS detected! Short MA: ${shortMA.toFixed(
                    2
                )}, Long MA: ${longMA.toFixed(
                    2
                )}, Confidence: ${confidence.toFixed(3)}`
            );
        }

        // Debug logging every 50 candles
        if (candles.length % 50 === 0) {
            console.log(
                `📊 MA Analysis at candle array size: ${
                    candles.length
                }: Short MA: ${shortMA.toFixed(2)}, Long MA: ${longMA.toFixed(
                    2
                )}, Spread: ${(currentSpread * 100).toFixed(3)}%`
            );
        }

        return {
            type: signal,
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            confidence,
            metadata: {
                shortMA: shortMA.toFixed(2),
                longMA: longMA.toFixed(2),
                spread: (currentSpread * 100).toFixed(2) + "%",
                prevSpread: (prevSpread * 100).toFixed(2) + "%",
            },
        };
    }

    private calculateMA(candles: Candle[], period: number): number {
        if (candles.length < period) return 0;

        const slice = candles.slice(-period);
        const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
        return sum / period;
    }
}
