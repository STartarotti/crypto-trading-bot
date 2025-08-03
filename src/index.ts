import { MovingAverageCrossover } from "./strategies/MovingAverageCrossover";
import { RSIStrategy } from "./strategies/RSIStrategy";
import { BollingerBandsStrategy } from "./strategies/BollingerBandsStrategy";
import { ScalpingStrategy } from "./strategies/ScalpingStrategy";
import { RSI_MA_ComboStrategy } from "./strategies/RSI_MA_ComboStrategy";
import { MACDStrategy } from "./strategies/MACDStrategy";
import { DataProvider } from "./data/DataProvider";
import { StrategyComparator } from "./backtesting/StrategyComparator";

async function main() {
    try {
        console.log("🤖 Crypto Trading Bot - Strategy Comparison Mode\n");

        // Initialize components
        const dataProvider = new DataProvider();
        const comparator = new StrategyComparator(10000); // $10,000 initial balance

        // Create multiple strategies to compare - Now with advanced strategies!
        const strategies = [
            // Classic strategies
            new MovingAverageCrossover(5, 20), // Fast MA crossover
            new MovingAverageCrossover(10, 50), // Standard MA crossover
            new RSIStrategy(14, 30, 70), // Standard RSI
            new BollingerBandsStrategy(20, 2), // Standard Bollinger Bands

            // Advanced strategies
            new ScalpingStrategy(5, 13, 7, 1.5), // Scalping with volume confirmation
            new RSI_MA_ComboStrategy(14, 30, 70, 10, 20), // RSI + MA combination
            new MACDStrategy(12, 26, 9), // MACD crossover

            // Variations for comparison
            new ScalpingStrategy(3, 8, 5, 2.0), // Faster scalping
            new RSI_MA_ComboStrategy(21, 25, 75, 5, 15), // More sensitive combo
        ];

        // Get data
        console.log("📊 Fetching historical data from Binance...");

        // Use real data from Binance
        const candles = await dataProvider.getHistoricalData(
            "BTCUSDT",
            "5m",
            2000
        ); // More data for better testing

        // Alternative: Use sample data for testing
        // const candles = dataProvider.generateSampleData(100);

        console.log(`✅ Loaded ${candles.length} 5-minute candles for BTCUSDT`);
        console.log(
            `📅 Data range: ${
                candles[0].timestamp.toISOString().split("T")[0]
            } to ${
                candles[candles.length - 1].timestamp
                    .toISOString()
                    .split("T")[0]
            }`
        );

        // Run comparison
        const results = await comparator.compareStrategies(strategies, candles);

        // Additional analysis
        console.log(`\n🔍 STRATEGY ANALYSIS:`);
        console.log(`─────────────────────────────────────`);

        // Group strategies by type
        const scalpingResults = results.filter((r) =>
            r.strategyName.includes("Scalping")
        );
        const comboResults = results.filter((r) =>
            r.strategyName.includes("Combo")
        );
        const classicResults = results.filter(
            (r) =>
                r.strategyName.includes("Moving Average") ||
                (r.strategyName.includes("RSI") &&
                    !r.strategyName.includes("Combo")) ||
                r.strategyName.includes("Bollinger")
        );
        const advancedResults = results.filter((r) =>
            r.strategyName.includes("MACD")
        );

        console.log(`📊 Classic Strategies: ${classicResults.length} tested`);
        console.log(`⚡ Scalping Strategies: ${scalpingResults.length} tested`);
        console.log(`🎯 Combo Strategies: ${comboResults.length} tested`);
        console.log(`🔬 Advanced Strategies: ${advancedResults.length} tested`);

        // Find best in each category
        if (scalpingResults.length > 0) {
            const bestScalping = scalpingResults.reduce((best, current) =>
                current.results.totalReturn > best.results.totalReturn
                    ? current
                    : best
            );
            console.log(
                `🏆 Best Scalping: ${
                    bestScalping.strategyName
                } (${bestScalping.results.totalReturn.toFixed(2)}%)`
            );
        }

        if (comboResults.length > 0) {
            const bestCombo = comboResults.reduce((best, current) =>
                current.results.totalReturn > best.results.totalReturn
                    ? current
                    : best
            );
            console.log(
                `🏆 Best Combo: ${
                    bestCombo.strategyName
                } (${bestCombo.results.totalReturn.toFixed(2)}%)`
            );
        }

        // Optional: Save results to file
        console.log(
            `\n💾 Comparison complete! Tested ${results.length} strategies on ${candles.length} data points.`
        );
        console.log(
            `💡 Tip: Run 'npm run live' to start the interactive trading interface!`
        );
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

if (require.main === module) {
    main();
}
