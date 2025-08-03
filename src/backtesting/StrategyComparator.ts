import { Strategy } from "../strategies/Strategy";
import { Backtester, BacktestResult } from "./Backtester";
import { Candle } from "../strategies/Strategy";

export interface StrategyComparison {
    strategyName: string;
    parameters: Record<string, any>;
    results: BacktestResult;
}

export class StrategyComparator {
    private initialBalance: number;

    constructor(initialBalance: number = 10000) {
        this.initialBalance = initialBalance;
    }

    async compareStrategies(
        strategies: Strategy[],
        candles: Candle[]
    ): Promise<StrategyComparison[]> {
        console.log(
            `\n🏁 Starting strategy comparison with ${strategies.length} strategies\n`
        );

        const comparisons: StrategyComparison[] = [];

        for (const strategy of strategies) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`🤖 Testing Strategy: ${strategy.getName()}`);
            console.log(`${"=".repeat(60)}`);

            const backtester = new Backtester(this.initialBalance);
            const results = await backtester.backtest(strategy, candles);

            comparisons.push({
                strategyName: strategy.getName(),
                parameters: strategy.getParameters(),
                results,
            });

            this.printStrategyResults(strategy.getName(), results);
        }

        console.log(`\n${"=".repeat(80)}`);
        console.log(`📊 STRATEGY COMPARISON SUMMARY`);
        console.log(`${"=".repeat(80)}`);

        this.printComparisonTable(comparisons);
        this.printBestPerformers(comparisons);

        return comparisons;
    }

    private printStrategyResults(
        strategyName: string,
        results: BacktestResult
    ): void {
        console.log(`\n📈 Results for ${strategyName}:`);
        console.log(`💰 Total Return: ${results.totalReturn.toFixed(2)}%`);
        console.log(`📊 Total Trades: ${results.totalTrades}`);
        console.log(`✅ Win Rate: ${results.winRate.toFixed(2)}%`);
        console.log(`📉 Max Drawdown: ${results.maxDrawdown.toFixed(2)}%`);
    }

    private printComparisonTable(comparisons: StrategyComparison[]): void {
        console.log("\n| Strategy | Return | Trades | Win Rate | Max DD |");
        console.log("|----------|--------|--------|----------|--------|");

        comparisons.forEach((comp) => {
            const { strategyName, results } = comp;
            console.log(
                `| ${strategyName.padEnd(8)} | ${results.totalReturn
                    .toFixed(1)
                    .padStart(5)}% | ${results.totalTrades
                    .toString()
                    .padStart(6)} | ${results.winRate
                    .toFixed(1)
                    .padStart(7)}% | ${results.maxDrawdown
                    .toFixed(1)
                    .padStart(5)}% |`
            );
        });
    }

    private printBestPerformers(comparisons: StrategyComparison[]): void {
        const bestReturn = comparisons.reduce((best, current) =>
            current.results.totalReturn > best.results.totalReturn
                ? current
                : best
        );

        const bestWinRate = comparisons.reduce((best, current) =>
            current.results.winRate > best.results.winRate ? current : best
        );

        const mostTrades = comparisons.reduce((best, current) =>
            current.results.totalTrades > best.results.totalTrades
                ? current
                : best
        );

        console.log(`\n🏆 BEST PERFORMERS:`);
        console.log(
            `💰 Highest Return: ${
                bestReturn.strategyName
            } (${bestReturn.results.totalReturn.toFixed(2)}%)`
        );
        console.log(
            `🎯 Best Win Rate: ${
                bestWinRate.strategyName
            } (${bestWinRate.results.winRate.toFixed(2)}%)`
        );
        console.log(
            `📈 Most Active: ${mostTrades.strategyName} (${mostTrades.results.totalTrades} trades)`
        );
    }
}
