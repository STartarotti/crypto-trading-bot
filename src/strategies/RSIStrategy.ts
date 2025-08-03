import { Strategy, Signal, Candle } from "./Strategy";
import { RSI } from "../config/parametersConfig.json";

export class RSIStrategy extends Strategy {
    private period: number;
    private oversoldThreshold: number;
    private overboughtThreshold: number;
    private lastSignal: "BUY" | "SELL" | "HOLD" = "HOLD";

    constructor(
        period: number = RSI.period,
        oversoldThreshold: number = RSI.oversoldThreshold,
        overboughtThreshold: number = RSI.overboughtThreshold
    ) {
        super("RSI Strategy", {
            period,
            oversoldThreshold,
            overboughtThreshold,
        });
        this.period = period;
        this.oversoldThreshold = oversoldThreshold;
        this.overboughtThreshold = overboughtThreshold;
    }

    analyze(candles: Candle[]): Signal {
        if (candles.length < this.period + 1) {
            return {
                type: "HOLD",
                price: candles[candles.length - 1].close,
                timestamp: candles[candles.length - 1].timestamp,
                confidence: 0,
            };
        }

        const rsi = this.calculateRSI(candles);
        const prevRSI = this.calculateRSI(candles.slice(0, -1));
        const currentCandle = candles[candles.length - 1];

        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let confidence = 0;

        // Buy signal: RSI crosses above oversold threshold
        if (
            prevRSI <= this.oversoldThreshold &&
            rsi > this.oversoldThreshold &&
            this.lastSignal !== "BUY"
        ) {
            signal = "BUY";
            confidence = Math.min(
                0.9,
                (this.oversoldThreshold - Math.min(prevRSI, 20)) / 20
            ); // Higher confidence for deeper oversold
            this.lastSignal = "BUY";
            console.log(
                `\n🎯 RSI BUY signal! RSI: ${rsi.toFixed(
                    2
                )} (was ${prevRSI.toFixed(
                    2
                )}), Confidence: ${confidence.toFixed(3)}`
            );
        }
        // Sell signal: RSI crosses below overbought threshold
        else if (
            prevRSI >= this.overboughtThreshold &&
            rsi < this.overboughtThreshold &&
            this.lastSignal !== "SELL"
        ) {
            signal = "SELL";
            confidence = Math.min(
                0.9,
                (Math.max(prevRSI, 80) - this.overboughtThreshold) / 20
            ); // Higher confidence for higher overbought
            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ RSI SELL signal! RSI: ${rsi.toFixed(
                    2
                )} (was ${prevRSI.toFixed(
                    2
                )}), Confidence: ${confidence.toFixed(3)}`
            );
        }

        // Debug logging every 100 candles
        if (candles.length % 100 === 0) {
            console.log(
                `📊 RSI Analysis at candle ${
                    candles.length
                }: RSI: ${rsi.toFixed(2)}, Status: ${
                    rsi < this.oversoldThreshold
                        ? "OVERSOLD"
                        : rsi > this.overboughtThreshold
                        ? "OVERBOUGHT"
                        : "NORMAL"
                }`
            );
        }

        return {
            type: signal,
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            confidence,
            metadata: {
                rsi: rsi.toFixed(2),
                prevRSI: prevRSI.toFixed(2),
                status:
                    rsi < this.oversoldThreshold
                        ? "OVERSOLD"
                        : rsi > this.overboughtThreshold
                        ? "OVERBOUGHT"
                        : "NORMAL",
            },
        };
    }

    private calculateRSI(candles: Candle[]): number {
        if (candles.length < this.period + 1) return 50;

        const changes: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            changes.push(candles[i].close - candles[i - 1].close);
        }

        // Use the last 'period' changes
        const recentChanges = changes.slice(-this.period);

        let gains = 0;
        let losses = 0;

        for (const change of recentChanges) {
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / this.period;
        const avgLoss = losses / this.period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);

        return rsi;
    }
}
