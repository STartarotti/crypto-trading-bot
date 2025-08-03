import { Strategy, Signal, Candle } from "./Strategy";
import { MACD } from "../config/parametersConfig.json";

export class MACDStrategy extends Strategy {
    private fastPeriod: number;
    private slowPeriod: number;
    private signalPeriod: number;
    private lastSignal: "BUY" | "SELL" | "HOLD" = "HOLD";

    constructor(
        fastPeriod: number = MACD.fastPeriod,
        slowPeriod: number = MACD.slowPeriod,
        signalPeriod: number = MACD.signalPeriod
    ) {
        super("MACD Strategy", { fastPeriod, slowPeriod, signalPeriod });
        this.fastPeriod = fastPeriod;
        this.slowPeriod = slowPeriod;
        this.signalPeriod = signalPeriod;
    }

    analyze(candles: Candle[]): Signal {
        if (candles.length < this.slowPeriod + this.signalPeriod + 5) {
            return {
                type: "HOLD",
                price: candles[candles.length - 1].close,
                timestamp: candles[candles.length - 1].timestamp,
                confidence: 0,
            };
        }

        const currentCandle = candles[candles.length - 1];

        // Calculate MACD components
        const macdData = this.calculateMACD(candles);
        const prevMACDData = this.calculateMACD(candles.slice(0, -1));

        if (!macdData || !prevMACDData) {
            return {
                type: "HOLD",
                price: currentCandle.close,
                timestamp: currentCandle.timestamp,
                confidence: 0,
            };
        }

        const { macd, signal: macdSignal, histogram } = macdData;
        const {
            macd: prevMACD,
            signal: prevMACDSignal,
            histogram: prevHistogram,
        } = prevMACDData;

        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let confidence = 0;

        // MACD Line crosses above Signal Line (bullish)
        const bullishCrossover =
            prevMACD <= prevMACDSignal && macd > macdSignal;

        // MACD Line crosses below Signal Line (bearish)
        const bearishCrossover =
            prevMACD >= prevMACDSignal && macd < macdSignal;

        // Histogram momentum (increasing/decreasing)
        const histogramIncreasing = histogram > prevHistogram;
        const histogramDecreasing = histogram < prevHistogram;

        // Zero line crosses
        const macdAboveZero = macd > 0;
        const macdBelowZero = macd < 0;

        if (bullishCrossover && this.lastSignal !== "BUY") {
            signal = "BUY";

            // Higher confidence if crossing above zero line or histogram is strongly positive
            if (macdAboveZero) {
                confidence = 0.8;
            } else if (histogram > 0) {
                confidence = 0.6;
            } else {
                confidence = 0.4;
            }

            this.lastSignal = "BUY";
            console.log(
                `\n🎯 MACD BUY! MACD: ${macd.toFixed(
                    4
                )}, Signal: ${macdSignal.toFixed(
                    4
                )}, Histogram: ${histogram.toFixed(4)}`
            );
        } else if (bearishCrossover && this.lastSignal !== "SELL") {
            signal = "SELL";

            // Higher confidence if crossing below zero line or histogram is strongly negative
            if (macdBelowZero) {
                confidence = 0.8;
            } else if (histogram < 0) {
                confidence = 0.6;
            } else {
                confidence = 0.4;
            }

            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ MACD SELL! MACD: ${macd.toFixed(
                    4
                )}, Signal: ${macdSignal.toFixed(
                    4
                )}, Histogram: ${histogram.toFixed(4)}`
            );
        }

        // Debug logging every 100 candles
        if (candles.length % 100 === 0) {
            const trend = macd > macdSignal ? "BULLISH" : "BEARISH";
            const momentum = histogramIncreasing
                ? "INCREASING"
                : histogramDecreasing
                ? "DECREASING"
                : "STABLE";
            console.log(
                `📊 MACD Analysis: ${macd.toFixed(4)}/${macdSignal.toFixed(
                    4
                )}, Histogram: ${histogram.toFixed(4)}, ${trend}, ${momentum}`
            );
        }

        return {
            type: signal,
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            confidence,
            metadata: {
                macd: macd.toFixed(4),
                signal: macdSignal.toFixed(4),
                histogram: histogram.toFixed(4),
                trend: macd > macdSignal ? "BULLISH" : "BEARISH",
                momentum: histogramIncreasing
                    ? "INCREASING"
                    : histogramDecreasing
                    ? "DECREASING"
                    : "STABLE",
            },
        };
    }

    private calculateMACD(
        candles: Candle[]
    ): { macd: number; signal: number; histogram: number } | null {
        if (candles.length < this.slowPeriod + this.signalPeriod) return null;

        // Calculate EMAs
        const fastEMA = this.calculateEMA(candles, this.fastPeriod);
        const slowEMA = this.calculateEMA(candles, this.slowPeriod);

        // MACD Line = Fast EMA - Slow EMA
        const macd = fastEMA - slowEMA;

        // Calculate Signal Line (EMA of MACD)
        // For simplicity, we'll calculate a simple moving average of recent MACD values
        const macdValues: number[] = [];
        for (
            let i = candles.length - this.signalPeriod;
            i < candles.length;
            i++
        ) {
            if (i >= this.slowPeriod) {
                const fEMA = this.calculateEMA(
                    candles.slice(0, i + 1),
                    this.fastPeriod
                );
                const sEMA = this.calculateEMA(
                    candles.slice(0, i + 1),
                    this.slowPeriod
                );
                macdValues.push(fEMA - sEMA);
            }
        }

        const signal =
            macdValues.reduce((sum, val) => sum + val, 0) / macdValues.length;
        const histogram = macd - signal;

        return { macd, signal, histogram };
    }

    private calculateEMA(candles: Candle[], period: number): number {
        if (candles.length < period) return candles[candles.length - 1].close;

        const multiplier = 2 / (period + 1);
        let ema = candles[candles.length - period].close;

        for (let i = candles.length - period + 1; i < candles.length; i++) {
            ema = candles[i].close * multiplier + ema * (1 - multiplier);
        }

        return ema;
    }
}
