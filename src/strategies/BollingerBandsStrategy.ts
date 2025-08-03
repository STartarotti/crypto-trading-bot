import { Strategy, Signal, Candle } from "./Strategy";
import { BBS } from "../config/parametersConfig.json";

export class BollingerBandsStrategy extends Strategy {
    private period: number;
    private standardDeviations: number;
    private lastSignal: "BUY" | "SELL" | "HOLD" = "HOLD";

    constructor(
        period: number = BBS.period,
        standardDeviations: number = BBS.standardDeviations
    ) {
        super("Bollinger Bands", { period, standardDeviations });
        this.period = period;
        this.standardDeviations = standardDeviations;
    }

    analyze(candles: Candle[]): Signal {
        if (candles.length < this.period) {
            return {
                type: "HOLD",
                price: candles[candles.length - 1].close,
                timestamp: candles[candles.length - 1].timestamp,
                confidence: 0,
            };
        }

        const { upperBand, lowerBand, middleBand } =
            this.calculateBollingerBands(candles);
        const currentCandle = candles[candles.length - 1];
        const price = currentCandle.close;

        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let confidence = 0;

        // Buy when price touches or goes below lower band
        if (price <= lowerBand && this.lastSignal !== "BUY") {
            signal = "BUY";
            confidence = Math.min(0.9, ((lowerBand - price) / lowerBand) * 10);
            this.lastSignal = "BUY";
            console.log(
                `\n🎯 BB BUY signal! Price: ${price.toFixed(
                    2
                )}, Lower Band: ${lowerBand.toFixed(
                    2
                )}, Confidence: ${confidence.toFixed(3)}`
            );
        }
        // Sell when price touches or goes above upper band
        else if (price >= upperBand && this.lastSignal !== "SELL") {
            signal = "SELL";
            confidence = Math.min(0.9, ((price - upperBand) / upperBand) * 10);
            this.lastSignal = "SELL";
            console.log(
                `\n⚰️ BB SELL signal! Price: ${price.toFixed(
                    2
                )}, Upper Band: ${upperBand.toFixed(
                    2
                )}, Confidence: ${confidence.toFixed(3)}`
            );
        }

        // Debug logging every 100 candles
        if (candles.length % 100 === 0) {
            const position =
                price > upperBand
                    ? "ABOVE UPPER"
                    : price < lowerBand
                    ? "BELOW LOWER"
                    : "WITHIN BANDS";
            console.log(
                `📊 BB Analysis at candle ${
                    candles.length
                }: Price: ${price.toFixed(2)}, Bands: [${lowerBand.toFixed(
                    2
                )}, ${middleBand.toFixed(2)}, ${upperBand.toFixed(
                    2
                )}], Position: ${position}`
            );
        }

        return {
            type: signal,
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            confidence,
            metadata: {
                price: price.toFixed(2),
                upperBand: upperBand.toFixed(2),
                middleBand: middleBand.toFixed(2),
                lowerBand: lowerBand.toFixed(2),
                bandWidth:
                    (((upperBand - lowerBand) / middleBand) * 100).toFixed(2) +
                    "%",
            },
        };
    }

    private calculateBollingerBands(candles: Candle[]): {
        upperBand: number;
        lowerBand: number;
        middleBand: number;
    } {
        const recentCandles = candles.slice(-this.period);

        // Calculate middle band (SMA)
        const middleBand =
            recentCandles.reduce((sum, candle) => sum + candle.close, 0) /
            this.period;

        // Calculate standard deviation
        const variance =
            recentCandles.reduce((sum, candle) => {
                return sum + Math.pow(candle.close - middleBand, 2);
            }, 0) / this.period;

        const standardDeviation = Math.sqrt(variance);

        // Calculate upper and lower bands
        const upperBand =
            middleBand + standardDeviation * this.standardDeviations;
        const lowerBand =
            middleBand - standardDeviation * this.standardDeviations;

        return { upperBand, lowerBand, middleBand };
    }
}
