import { Strategy, Signal, Candle } from "./Strategy";
import { RSI_MA } from "../config/parametersConfig.json";

export class RSI_MA_ComboStrategy extends Strategy {
    private rsiPeriod: number;
    private rsiOversold: number;
    private rsiOverbought: number;
    private maShortPeriod: number;
    private maLongPeriod: number;
    private lastSignal: "BUY" | "SELL" | "HOLD" = "HOLD";

    constructor(
        rsiPeriod: number = RSI_MA.rsiPeriod,
        rsiOversold: number = RSI_MA.rsiOversold,
        rsiOverbought: number = RSI_MA.rsiOverbought,
        maShortPeriod: number = RSI_MA.maShortPeriod,
        maLongPeriod: number = RSI_MA.maLongPeriod
    ) {
        super("RSI + MA Combo", {
            rsiPeriod,
            rsiOversold,
            rsiOverbought,
            maShortPeriod,
            maLongPeriod,
        });
        this.rsiPeriod = rsiPeriod;
        this.rsiOversold = rsiOversold;
        this.rsiOverbought = rsiOverbought;
        this.maShortPeriod = maShortPeriod;
        this.maLongPeriod = maLongPeriod;
    }

    analyze(candles: Candle[]): Signal {
        if (candles.length < Math.max(this.rsiPeriod, this.maLongPeriod) + 5) {
            return {
                type: "HOLD",
                price: candles[candles.length - 1].close,
                timestamp: candles[candles.length - 1].timestamp,
                confidence: 0,
            };
        }

        const currentCandle = candles[candles.length - 1];

        // Calculate indicators
        const rsi = this.calculateRSI(candles);
        const prevRSI = this.calculateRSI(candles.slice(0, -1));

        const shortMA = this.calculateMA(candles, this.maShortPeriod);
        const longMA = this.calculateMA(candles, this.maLongPeriod);
        const prevShortMA = this.calculateMA(
            candles.slice(0, -1),
            this.maShortPeriod
        );
        const prevLongMA = this.calculateMA(
            candles.slice(0, -1),
            this.maLongPeriod
        );

        // Trend direction
        const bullishTrend = shortMA > longMA;
        const bearishTrend = shortMA < longMA;
        const trendStrength = Math.abs((shortMA - longMA) / longMA);

        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let confidence = 0;

        // Combined strategy logic
        // BUY: RSI oversold recovery + bullish MA trend + MA cross confirmation
        const rsiOversoldRecovery =
            prevRSI <= this.rsiOversold && rsi > this.rsiOversold;
        const maUpCross = prevShortMA <= prevLongMA && shortMA > longMA;
        const strongBullishTrend = bullishTrend && trendStrength > 0.001;

        // SELL: RSI overbought decline + bearish MA trend + MA cross confirmation
        const rsiOverboughtDecline =
            prevRSI >= this.rsiOverbought && rsi < this.rsiOverbought;
        const maDownCross = prevShortMA >= prevLongMA && shortMA < longMA;
        const strongBearishTrend = bearishTrend && trendStrength > 0.001;

        // Multi-condition BUY signals (ordered by strength)
        if (rsiOversoldRecovery && maUpCross && this.lastSignal !== "BUY") {
            // Strongest signal: RSI recovery + fresh MA crossover
            signal = "BUY";
            confidence = 0.9;
            this.lastSignal = "BUY";
            console.log(
                `\n🎯 COMBO BUY (Strong)! RSI recovery: ${prevRSI.toFixed(
                    1
                )} → ${rsi.toFixed(1)}, MA Cross: ${shortMA.toFixed(
                    2
                )} > ${longMA.toFixed(2)}`
            );
        } else if (
            rsiOversoldRecovery &&
            strongBullishTrend &&
            this.lastSignal !== "BUY"
        ) {
            // Medium signal: RSI recovery in bullish trend
            signal = "BUY";
            confidence = 0.7;
            this.lastSignal = "BUY";
            console.log(
                `\n🎯 COMBO BUY (Medium)! RSI recovery: ${rsi.toFixed(
                    1
                )}, Bullish trend strength: ${(trendStrength * 100).toFixed(
                    2
                )}%`
            );
        } else if (maUpCross && rsi < 60 && this.lastSignal !== "BUY") {
            // Weaker signal: MA cross with acceptable RSI
            signal = "BUY";
            confidence = 0.5;
            this.lastSignal = "BUY";
            console.log(
                `\n🎯 COMBO BUY (Weak)! MA Cross with RSI: ${rsi.toFixed(1)}`
            );
        }

        // Multi-condition SELL signals (ordered by strength)
        else if (
            rsiOverboughtDecline &&
            maDownCross &&
            this.lastSignal !== "SELL"
        ) {
            // Strongest signal: RSI decline + fresh MA crossover
            signal = "SELL";
            confidence = 0.9;
            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ COMBO SELL (Strong)! RSI decline: ${prevRSI.toFixed(
                    1
                )} → ${rsi.toFixed(1)}, MA Cross: ${shortMA.toFixed(
                    2
                )} < ${longMA.toFixed(2)}`
            );
        } else if (
            rsiOverboughtDecline &&
            strongBearishTrend &&
            this.lastSignal !== "SELL"
        ) {
            // Medium signal: RSI decline in bearish trend
            signal = "SELL";
            confidence = 0.7;
            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ COMBO SELL (Medium)! RSI decline: ${rsi.toFixed(
                    1
                )}, Bearish trend strength: ${(trendStrength * 100).toFixed(
                    2
                )}%`
            );
        } else if (maDownCross && rsi > 40 && this.lastSignal !== "SELL") {
            // Weaker signal: MA cross with acceptable RSI
            signal = "SELL";
            confidence = 0.5;
            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ COMBO SELL (Weak)! MA Cross with RSI: ${rsi.toFixed(1)}`
            );
        }

        // Debug logging every 100 candles
        if (candles.length % 100 === 0) {
            const trend = bullishTrend
                ? "BULLISH"
                : bearishTrend
                ? "BEARISH"
                : "SIDEWAYS";
            console.log(
                `📊 Combo Analysis: RSI: ${rsi.toFixed(
                    1
                )}, MA: ${shortMA.toFixed(2)}/${longMA.toFixed(
                    2
                )}, Trend: ${trend} (${(trendStrength * 100).toFixed(2)}%)`
            );
        }

        return {
            type: signal,
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            confidence,
            metadata: {
                rsi: rsi.toFixed(1),
                prevRSI: prevRSI.toFixed(1),
                shortMA: shortMA.toFixed(2),
                longMA: longMA.toFixed(2),
                trend: bullishTrend
                    ? "BULLISH"
                    : bearishTrend
                    ? "BEARISH"
                    : "SIDEWAYS",
                trendStrength: (trendStrength * 100).toFixed(2) + "%",
            },
        };
    }

    private calculateRSI(candles: Candle[]): number {
        if (candles.length < this.rsiPeriod + 1) return 50;

        const changes: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            changes.push(candles[i].close - candles[i - 1].close);
        }

        const recentChanges = changes.slice(-this.rsiPeriod);

        let gains = 0;
        let losses = 0;

        for (const change of recentChanges) {
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / this.rsiPeriod;
        const avgLoss = losses / this.rsiPeriod;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }

    private calculateMA(candles: Candle[], period: number): number {
        if (candles.length < period) return candles[candles.length - 1].close;

        const slice = candles.slice(-period);
        const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
        return sum / period;
    }
}
