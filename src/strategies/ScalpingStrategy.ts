import { Strategy, Signal, Candle } from "./Strategy";
import { Scalping } from "../config/parametersConfig.json";

export class ScalpingStrategy extends Strategy {
    private spreadThreshold: number;
    private volumeThreshold: number;
    private quickProfitTarget: number; // Quick profit target in %
    private maxHoldTime: number; // Maximum hold time in candles
    private volatilityPeriod: number;
    private minVolatility: number;
    private positions: Map<
        string,
        { entry: number; timestamp: Date; candles: number }
    > = new Map();
    private recentTrades: Array<{ timestamp: Date; profit: number }> = [];

    constructor(
        spreadThreshold: number = Scalping.spreadThreshold || 0.02,
        volumeThreshold: number = Scalping.volumeThreshold || 1.5,
        quickProfitTarget: number = Scalping.quickProfitTarget || 0.15,
        maxHoldTime: number = Scalping.maxHoldTime || 5,
        volatilityPeriod: number = Scalping.volatilityPeriod || 10,
        minVolatility: number = Scalping.minVolatility || 0.1
    ) {
        super("Advanced Scalping Strategy", {
            spreadThreshold,
            volumeThreshold,
            quickProfitTarget,
            maxHoldTime,
            volatilityPeriod,
            minVolatility,
        });
        this.spreadThreshold = spreadThreshold;
        this.volumeThreshold = volumeThreshold;
        this.quickProfitTarget = quickProfitTarget;
        this.maxHoldTime = maxHoldTime;
        this.volatilityPeriod = volatilityPeriod;
        this.minVolatility = minVolatility;
    }

    analyze(candles: Candle[]): Signal {
        if (candles.length < this.volatilityPeriod + 5) {
            return this.createHoldSignal(candles[candles.length - 1]);
        }

        const currentCandle = candles[candles.length - 1];

        // Update position holding times
        this.updatePositions();

        // Clean old trades (keep only last hour)
        this.cleanOldTrades(currentCandle.timestamp);

        // Check if we should exit existing positions first
        const exitSignal = this.checkExitConditions(candles);
        if (exitSignal.type !== "HOLD") {
            return exitSignal;
        }

        // Check if we can enter new positions
        const entrySignal = this.checkEntryConditions(candles);
        return entrySignal;
    }

    private checkExitConditions(candles: Candle[]): Signal {
        const currentCandle = candles[candles.length - 1];

        for (const [positionType, position] of this.positions.entries()) {
            const priceChange =
                ((currentCandle.close - position.entry) / position.entry) * 100;
            const isLong = positionType === "LONG";
            const profit = isLong ? priceChange : -priceChange;

            // AGGRESSIVE: Quick profit taking - even smaller profits count
            if (profit >= this.quickProfitTarget * 0.5) {
                // Take profits at 50% of target too
                this.positions.delete(positionType);
                this.recentTrades.push({
                    timestamp: currentCandle.timestamp,
                    profit,
                });

                console.log(
                    `💰 AGGRESSIVE EXIT - Quick Profit: ${profit.toFixed(
                        3
                    )}% in ${position.candles} candles`
                );

                return {
                    type: isLong ? "SELL" : "BUY",
                    price: currentCandle.close,
                    timestamp: currentCandle.timestamp,
                    confidence: 0.9,
                    metadata: {
                        reason: "quick_profit",
                        profit: profit.toFixed(3) + "%",
                        holdTime: position.candles,
                    },
                };
            }

            // Max hold time exit - but only if losing money or flat
            if (position.candles >= this.maxHoldTime && profit <= 0) {
                this.positions.delete(positionType);
                this.recentTrades.push({
                    timestamp: currentCandle.timestamp,
                    profit,
                });

                console.log(
                    `⏰ SCALP EXIT - Max Hold (losing): ${profit.toFixed(
                        3
                    )}% after ${position.candles} candles`
                );

                return {
                    type: isLong ? "SELL" : "BUY",
                    price: currentCandle.close,
                    timestamp: currentCandle.timestamp,
                    confidence: 0.7,
                    metadata: {
                        reason: "max_hold_losing",
                        profit: profit.toFixed(3) + "%",
                        holdTime: position.candles,
                    },
                };
            }

            // Dynamic exit: if momentum turns against us
            const momentum = this.calculateMomentum(candles);
            const priceAction = this.analyzePriceAction(candles);
            const momentumReversed =
                (isLong && momentum.direction === "DOWN") ||
                (!isLong && momentum.direction === "UP");

            if (
                momentumReversed &&
                position.candles >= 2 &&
                profit < this.quickProfitTarget * 0.5
            ) {
                this.positions.delete(positionType);
                this.recentTrades.push({
                    timestamp: currentCandle.timestamp,
                    profit,
                });

                console.log(
                    `🔄 SCALP EXIT - Momentum Reversal: ${profit.toFixed(
                        3
                    )}% after ${position.candles} candles`
                );

                return {
                    type: isLong ? "SELL" : "BUY",
                    price: currentCandle.close,
                    timestamp: currentCandle.timestamp,
                    confidence: 0.8,
                    metadata: {
                        reason: "momentum_reversal",
                        profit: profit.toFixed(3) + "%",
                        holdTime: position.candles,
                    },
                };
            }

            // Stop loss - cut losses quickly
            const stopLoss = -this.quickProfitTarget * 2; // 2:1 risk/reward ratio
            if (profit <= stopLoss) {
                this.positions.delete(positionType);
                this.recentTrades.push({
                    timestamp: currentCandle.timestamp,
                    profit,
                });

                console.log(
                    `🛑 SCALP STOP LOSS: ${profit.toFixed(3)}% loss in ${
                        position.candles
                    } candles`
                );

                return {
                    type: isLong ? "SELL" : "BUY",
                    price: currentCandle.close,
                    timestamp: currentCandle.timestamp,
                    confidence: 0.8,
                    metadata: {
                        reason: "stop_loss",
                        profit: profit.toFixed(3) + "%",
                        holdTime: position.candles,
                    },
                };
            }
        }

        return this.createHoldSignal(candles[candles.length - 1]);
    }

    private checkEntryConditions(candles: Candle[]): Signal {
        const currentCandle = candles[candles.length - 1];

        // Don't enter if we already have positions (scalping should be focused)
        if (this.positions.size > 0) {
            return this.createHoldSignal(currentCandle);
        }

        // Get immediate market signals - be aggressive!
        const instantSignal = this.getInstantScalpSignal(candles);
        if (instantSignal.type !== "HOLD") {
            return instantSignal;
        }

        // Fallback to standard analysis but with aggressive thresholds
        const priceAction = this.analyzePriceAction(candles);
        const momentum = this.calculateMomentum(candles);
        const volumeRatio = this.checkVolumeSpike(candles);

        let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
        let confidence = 0;
        let reason = "";

        // AGGRESSIVE: Enter on any decent price movement with volume
        if (
            priceAction.direction === "UP" &&
            (volumeRatio || momentum.strength > 0.2)
        ) {
            signal = "BUY";
            confidence = 0.7;
            reason = "aggressive_bullish";
            this.positions.set("LONG", {
                entry: currentCandle.close,
                timestamp: currentCandle.timestamp,
                candles: 0,
            });

            console.log(
                `🚀 AGGRESSIVE SCALP BUY: Price: ${
                    currentCandle.close
                }, Action: ${
                    priceAction.direction
                }, Mom: ${momentum.strength.toFixed(2)}`
            );
        } else if (
            priceAction.direction === "DOWN" &&
            (volumeRatio || momentum.strength > 0.2)
        ) {
            signal = "SELL";
            confidence = 0.7;
            reason = "aggressive_bearish";
            this.positions.set("SHORT", {
                entry: currentCandle.close,
                timestamp: currentCandle.timestamp,
                candles: 0,
            });

            console.log(
                `📉 AGGRESSIVE SCALP SELL: Price: ${
                    currentCandle.close
                }, Action: ${
                    priceAction.direction
                }, Mom: ${momentum.strength.toFixed(2)}`
            );
        }

        return {
            type: signal,
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            confidence,
            metadata: {
                reason,
                priceAction: priceAction.direction,
                momentum: momentum.strength.toFixed(2),
                volumeRatio: volumeRatio.toString(),
            },
        };
    }

    private calculateVolatility(candles: Candle[]): number {
        const recentCandles = candles.slice(-this.volatilityPeriod);
        const prices = recentCandles.map((c) => c.close);

        const mean =
            prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance =
            prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
            prices.length;

        return Math.sqrt(variance) / mean; // Coefficient of variation
    }

    private checkVolumeSpike(candles: Candle[]): boolean {
        const currentVolume = candles[candles.length - 1].volume;
        const avgVolume = this.calculateAverageVolume(candles, 20);

        return currentVolume / avgVolume >= this.volumeThreshold;
    }

    private analyzePriceAction(candles: Candle[]): {
        direction: "UP" | "DOWN" | "SIDEWAYS";
        strength: number;
    } {
        const current = candles[candles.length - 1];
        const prev = candles[candles.length - 2];

        // AGGRESSIVE: Look at immediate tick-by-tick movement
        const instantChange = (current.close - prev.close) / prev.close;
        const bodySize = Math.abs(current.close - current.open) / current.open;

        // Much more sensitive to small movements
        const strength = Math.min(
            1,
            Math.abs(instantChange) * 2000 + bodySize * 100
        );

        if (instantChange > 0.0001) {
            // Even tiny moves count
            return { direction: "UP", strength };
        } else if (instantChange < -0.0001) {
            return { direction: "DOWN", strength };
        }

        return { direction: "SIDEWAYS", strength: 0 };
    }

    private calculateMomentum(candles: Candle[]): {
        strength: number;
        direction: "UP" | "DOWN" | "NEUTRAL";
    } {
        const recent = candles.slice(-3);
        let upMoves = 0;
        let downMoves = 0;

        for (let i = 1; i < recent.length; i++) {
            const change = recent[i].close - recent[i - 1].close;
            if (change > 0) upMoves++;
            else if (change < 0) downMoves++;
        }

        const strength = Math.abs(upMoves - downMoves) / recent.length;
        const direction =
            upMoves > downMoves
                ? "UP"
                : downMoves > upMoves
                ? "DOWN"
                : "NEUTRAL";

        return { strength, direction };
    }

    private calculateSpread(candles: Candle[]): number {
        const current = candles[candles.length - 1];
        return (current.high - current.low) / current.close;
    }

    // NEW: Instant scalp signal for aggressive entries
    private getInstantScalpSignal(candles: Candle[]): Signal {
        const current = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        const prev2 = candles[candles.length - 3];

        // Immediate price spike detection
        const instantChange = (current.close - prev.close) / prev.close;
        const prevChange = (prev.close - prev2.close) / prev2.close;

        // Volume confirmation (but not required)
        const volumeBoost = current.volume > prev.volume * 1.1;

        // VERY AGGRESSIVE: Enter on any significant tick movement
        const significantMove = Math.abs(instantChange) > 0.0003; // 0.03% move
        const accelerating =
            Math.sign(instantChange) === Math.sign(prevChange) &&
            Math.abs(instantChange) > Math.abs(prevChange);

        if (significantMove && (accelerating || volumeBoost)) {
            const signal = instantChange > 0 ? "BUY" : "SELL";
            const positionType = signal === "BUY" ? "LONG" : "SHORT";

            this.positions.set(positionType, {
                entry: current.close,
                timestamp: current.timestamp,
                candles: 0,
            });

            console.log(
                `⚡ INSTANT SCALP ${signal}! Price: ${
                    current.close
                }, Change: ${(instantChange * 100).toFixed(
                    3
                )}%, Vol Boost: ${volumeBoost}`
            );

            return {
                type: signal,
                price: current.close,
                timestamp: current.timestamp,
                confidence: 0.8,
                metadata: {
                    reason: "instant_scalp",
                    priceChange: (instantChange * 100).toFixed(3) + "%",
                    volumeBoost,
                    accelerating,
                },
            };
        }

        return this.createHoldSignal(current);
    }

    private updatePositions(): void {
        for (const [key, position] of this.positions.entries()) {
            position.candles++;
        }
    }

    private cleanOldTrades(currentTime: Date): void {
        const oneHourAgo = new Date(currentTime.getTime() - 3600000);
        this.recentTrades = this.recentTrades.filter(
            (trade) => trade.timestamp > oneHourAgo
        );
    }

    private calculateAverageVolume(candles: Candle[], period: number): number {
        const recentCandles = candles.slice(-period);
        const totalVolume = recentCandles.reduce(
            (sum, candle) => sum + candle.volume,
            0
        );
        return totalVolume / recentCandles.length;
    }

    private createHoldSignal(candle: Candle): Signal {
        return {
            type: "HOLD",
            price: candle.close,
            timestamp: candle.timestamp,
            confidence: 0,
            metadata: {
                reason: "no_signal",
                positions: this.positions.size,
            },
        };
    }

    // Public method to get current positions (useful for external monitoring)
    public getCurrentPositions(): Map<
        string,
        { entry: number; timestamp: Date; candles: number }
    > {
        return new Map(this.positions);
    }

    // Public method to get recent performance
    public getRecentPerformance(): {
        trades: number;
        avgProfit: number;
        winRate: number;
    } {
        if (this.recentTrades.length === 0) {
            return { trades: 0, avgProfit: 0, winRate: 0 };
        }

        const totalProfit = this.recentTrades.reduce(
            (sum, trade) => sum + trade.profit,
            0
        );
        const winningTrades = this.recentTrades.filter(
            (trade) => trade.profit > 0
        ).length;

        return {
            trades: this.recentTrades.length,
            avgProfit: totalProfit / this.recentTrades.length,
            winRate: winningTrades / this.recentTrades.length,
        };
    }
}
