import * as readline from "readline";
import { MovingAverageCrossover } from "../strategies/MovingAverageCrossover";
import { RSIStrategy } from "../strategies/RSIStrategy";
import { BollingerBandsStrategy } from "../strategies/BollingerBandsStrategy";
import { ScalpingStrategy } from "../strategies/ScalpingStrategy";
import { RSI_MA_ComboStrategy } from "../strategies/RSI_MA_ComboStrategy";
import { MACDStrategy } from "../strategies/MACDStrategy";
import { Strategy } from "../strategies/Strategy";
import { TradingBot, BotConfig } from "../trading/TradingBot";
import { BinanceClient, BinanceConfig } from "../exchanges/BinanceClient";
import { StrategyComparator } from "../backtesting/StrategyComparator";
import { DataProvider } from "../data/DataProvider";
import config from "../config/parametersConfig.json";

export class InteractiveCLI {
    private rl: readline.Interface;
    private binanceClient: BinanceClient | null = null;
    private currentBot: TradingBot | null = null;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        this.binanceClient = new BinanceClient({
            apiKey: process.env.BINANCE_API_KEY || "",
            secretKey: process.env.BINANCE_SECRET_KEY || "",
            testnet: process.env.BINANCE_TESTNET === "true",
        });
    }

    async start(): Promise<void> {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🤖 CRYPTO TRADING BOT                      ║
║                      Interactive CLI                          ║
╚═══════════════════════════════════════════════════════════════╝
    `);

        await this.showMainMenu();
    }

    private async showMainMenu(): Promise<void> {
        console.log(`\n📋 Main Menu:`);
        console.log(`1. 🔧 Configure Binance Connection`);
        console.log(`2. 📊 Run Strategy Comparison (Backtesting)`);
        console.log(`3. 🎭 Start Demo Trading`);
        console.log(`4. 💰 Start Live Trading`);
        console.log(`5. 📈 Check Account Status`);
        console.log(`6. 🛑 Stop Current Bot`);
        console.log(`7. ❌ Exit`);

        const choice = await this.askQuestion("\n🎯 Choose an option (1-7): ");

        switch (choice) {
            case "1":
                await this.configureBinance();
                break;
            case "2":
                await this.runStrategyComparison();
                break;
            case "3":
                await this.startDemoTrading();
                break;
            case "4":
                await this.startLiveTrading();
                break;
            case "5":
                await this.checkAccountStatus();
                break;
            case "6":
                await this.stopBot();
                break;
            case "7":
                console.log("👋 Goodbye!");
                this.rl.close();
                return;
            default:
                console.log("❌ Invalid option. Please try again.");
        }

        await this.showMainMenu();
    }

    private async configureBinance(): Promise<void> {
        console.log(`\n🔧 Binance Configuration:`);
        console.log(
            `⚠️  You can get API keys from: https://www.binance.com/en/my/settings/api-management`
        );
        console.log(`⚠️  For testnet: https://testnet.binance.vision/`);

        const apiKey = await this.askQuestion("🔑 Enter API Key: ");
        const secretKey = await this.askQuestion("🔐 Enter Secret Key: ");
        const useTestnet = await this.askQuestion("🧪 Use testnet? (y/N): ");

        const config: BinanceConfig = {
            apiKey,
            secretKey,
            testnet: useTestnet.toLowerCase() === "y",
        };

        try {
            this.binanceClient = new BinanceClient(config);

            // Test connection
            console.log("🔄 Testing connection...");
            await this.binanceClient.getCurrentPrice("BTCUSDT");

            console.log(
                `✅ Successfully connected to Binance ${
                    config.testnet ? "Testnet" : "Mainnet"
                }`
            );
        } catch (error) {
            console.log(
                "❌ Failed to connect to Binance. Please check your credentials."
            );
            this.binanceClient = null;
        }
    }

    private async runStrategyComparison(): Promise<void> {
        if (!this.binanceClient) {
            console.log("❌ Please configure Binance connection first.");
            return;
        }

        console.log(`\n📊 Strategy Comparison Setup:`);

        const symbol =
            (await this.askQuestion(
                "💰 Enter trading pair (default: BTCUSDT): "
            )) || "BTCUSDT";
        const interval =
            (await this.askQuestion(
                "⏰ Enter interval (1m/5m/15m/1h/4h/1d, default: 1h): "
            )) || "1h";
        const dataPoints = parseInt(
            (await this.askQuestion(
                "📈 Number of data points (default: 500): "
            )) || "500"
        );

        console.log("🔄 Fetching historical data...");
        const dataProvider = new DataProvider();
        const candles = await dataProvider.getHistoricalData(
            symbol,
            interval,
            dataPoints
        );

        const strategies = await this.selectStrategiesForComparison();

        const comparator = new StrategyComparator(10000);
        await comparator.compareStrategies(strategies, candles);
    }

    private async selectStrategiesForComparison(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n🎯 Select strategies to compare:`);
        console.log(`1. Moving Average Crossover`);
        console.log(`2. RSI Strategy`);
        console.log(`3. Bollinger Bands`);
        console.log(`4. Scalping Strategy`);
        console.log(`5. RSI + MA Combo`);
        console.log(`6. MACD Strategy`);
        console.log(`7. All strategies with default parameters`);

        const choice = await this.askQuestion("Choose option (1-7): ");

        switch (choice) {
            case "1":
                strategies.push(...(await this.configureMAStrategies()));
                break;
            case "2":
                strategies.push(...(await this.configureRSIStrategies()));
                break;
            case "3":
                strategies.push(...(await this.configureBBStrategies()));
                break;
            case "4":
                strategies.push(...(await this.configureScalpingStrategies()));
                break;
            case "5":
                strategies.push(...(await this.configureComboStrategies()));
                break;
            case "6":
                strategies.push(...(await this.configureMACDStrategies()));
                break;
            case "7":
            default:
                strategies.push(
                    new MovingAverageCrossover(),
                    new RSIStrategy(),
                    new BollingerBandsStrategy(),
                    new ScalpingStrategy(),
                    new RSI_MA_ComboStrategy(),
                    new MACDStrategy()
                );
        }

        return strategies;
    }

    private async startDemoTrading(): Promise<void> {
        if (!this.binanceClient) {
            console.log("❌ Please configure Binance connection first.");
            return;
        }

        const config = await this.getBotConfiguration(true);

        this.currentBot = new TradingBot(config, this.binanceClient);

        console.log(`\n🎭 Starting Demo Trading...`);
        console.log(`⚠️  This is paper trading - no real money involved`);

        await this.currentBot.start();

        console.log(
            `\n✅ Demo bot is now running. Press Enter to return to menu.`
        );
        await this.askQuestion("");
    }

    private async startLiveTrading(): Promise<void> {
        if (!this.binanceClient) {
            console.log("❌ Please configure Binance connection first.");
            return;
        }

        console.log(`\n💰 ⚠️  LIVE TRADING MODE ⚠️`);
        console.log(`🚨 This will use REAL MONEY. Are you sure?`);

        const confirm = await this.askQuestion(
            'Type "I UNDERSTAND THE RISKS" to continue: '
        );

        if (confirm !== "I UNDERSTAND THE RISKS") {
            console.log("❌ Live trading cancelled.");
            return;
        }

        const config = await this.getBotConfiguration(false);

        this.currentBot = new TradingBot(config, this.binanceClient);

        console.log(`\n💰 Starting Live Trading...`);
        console.log(`🚨 REAL MONEY AT RISK!`);

        await this.currentBot.start();

        const activateNow = await this.askQuestion(
            "🔴 Activate live trading now? (y/N): "
        );
        if (activateNow.toLowerCase() === "y") {
            this.currentBot.activateLiveTrading();
        }

        console.log(
            `\n✅ Live bot is now running. Press Enter to return to menu.`
        );
        await this.askQuestion("");
    }

    private async getBotConfiguration(demoMode: boolean): Promise<BotConfig> {
        console.log(`\n🔧 Bot Configuration:`);

        const symbol =
            (await this.askQuestion("💰 Trading pair (default: BTCUSDT): ")) ||
            "BTCUSDT";
        const interval =
            (await this.askQuestion(
                "⏰ Interval (1m/5m/15m/1h, default: 5m): "
            )) || "5m";
        const tradeAmount = parseFloat(
            (await this.askQuestion(
                "💵 Trade amount in USDT (default: 100): "
            )) || "100"
        );

        const strategy = await this.selectAndConfigureStrategy();

        return {
            symbol,
            strategy,
            interval,
            tradeAmount,
            demoMode,
            riskManagement: {
                maxLossPercent: 5,
                stopLossPercent: 2,
            },
        };
    }

    private async selectAndConfigureStrategy(): Promise<Strategy> {
        console.log(`\n🎯 Select Trading Strategy:`);
        console.log(`1. Moving Average Crossover - Classic trend following`);
        console.log(`2. RSI Strategy - Momentum oscillator`);
        console.log(`3. Bollinger Bands - Volatility breakout`);
        console.log(`4. Scalping Strategy - High-frequency short-term trades`);
        console.log(
            `5. RSI + MA Combo - Combined indicators for better signals`
        );
        console.log(`6. MACD Strategy - Moving Average Convergence Divergence`);

        const choice = await this.askQuestion("Choose strategy (1-6): ");

        switch (choice) {
            case "1":
                return await this.configureMAStrategy();
            case "2":
                return await this.configureRSIStrategy();
            case "3":
                return await this.configureBBStrategy();
            case "4":
                return await this.configureScalpingStrategy();
            case "5":
                return await this.configureComboStrategy();
            case "6":
                return await this.configureMACDStrategy();
            default:
                console.log("Using default Moving Average Crossover strategy");
                return new MovingAverageCrossover();
        }
    }

    private async configureMAStrategy(): Promise<MovingAverageCrossover> {
        console.log(`\n📈 Moving Average Crossover Configuration:`);
        console.log(`💡 Tip: Lower periods = more signals but more noise`);

        const shortPeriod = parseInt(
            (await this.askQuestion(
                "📊 Short MA period (default: " + config.MAC.shortPeriod + "): "
            )) || config.MAC.shortPeriod.toString()
        );
        const longPeriod = parseInt(
            (await this.askQuestion(
                "📊 Long MA period (default: " + config.MAC.longPeriod + "): "
            )) || config.MAC.longPeriod.toString()
        );

        if (shortPeriod >= longPeriod) {
            console.log(
                "⚠️ Short period must be less than long period. Using defaults."
            );
            return new MovingAverageCrossover();
        }

        console.log(`✅ Configured: MA(${shortPeriod}, ${longPeriod})`);
        return new MovingAverageCrossover(shortPeriod, longPeriod);
    }

    private async configureRSIStrategy(): Promise<RSIStrategy> {
        console.log(`\n📊 RSI Strategy Configuration:`);
        console.log(
            `💡 Tip: Lower thresholds = more conservative, higher = more aggressive`
        );

        const period = parseInt(
            (await this.askQuestion(
                "📈 RSI period (default: " + config.RSI.period + "): "
            )) || config.RSI.period.toString()
        );
        const oversold = parseInt(
            (await this.askQuestion(
                "📉 Oversold threshold (default: " +
                    config.RSI.oversoldThreshold +
                    "): "
            )) || config.RSI.oversoldThreshold.toString()
        );
        const overbought = parseInt(
            (await this.askQuestion(
                "📈 Overbought threshold (default: " +
                    config.RSI.overboughtThreshold +
                    "): "
            )) || config.RSI.overboughtThreshold.toString()
        );

        console.log(
            `✅ Configured: RSI(${period}) with thresholds ${oversold}/${overbought}`
        );
        return new RSIStrategy(period, oversold, overbought);
    }

    private async configureBBStrategy(): Promise<BollingerBandsStrategy> {
        console.log(`\n📊 Bollinger Bands Configuration:`);
        console.log(`💡 Tip: Lower std dev = tighter bands, more signals`);

        const period = parseInt(
            (await this.askQuestion(
                "📈 Period (default: " + config.BBS.period + "): "
            )) || config.BBS.period.toString()
        );
        const stdDev = parseFloat(
            (await this.askQuestion(
                "📊 Standard deviations (default: " +
                    config.BBS.standardDeviations +
                    "): "
            )) || config.BBS.standardDeviations.toString()
        );

        console.log(`✅ Configured: BB(${period}, ${stdDev})`);
        return new BollingerBandsStrategy(period, stdDev);
    }

    private async configureMAStrategies(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n📈 Configure Multiple MA Strategies:`);
        const addAnother = async (): Promise<void> => {
            strategies.push(await this.configureMAStrategy());

            const more = await this.askQuestion(
                "Add another MA strategy? (y/N): "
            );
            if (more.toLowerCase() === "y") {
                await addAnother();
            }
        };

        await addAnother();
        return strategies;
    }

    private async configureRSIStrategies(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n📊 Configure Multiple RSI Strategies:`);
        const addAnother = async (): Promise<void> => {
            strategies.push(await this.configureRSIStrategy());

            const more = await this.askQuestion(
                "Add another RSI strategy? (y/N): "
            );
            if (more.toLowerCase() === "y") {
                await addAnother();
            }
        };

        await addAnother();
        return strategies;
    }

    private async configureBBStrategies(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n📊 Configure Multiple Bollinger Bands Strategies:`);
        const addAnother = async (): Promise<void> => {
            strategies.push(await this.configureBBStrategy());

            const more = await this.askQuestion(
                "Add another BB strategy? (y/N): "
            );
            if (more.toLowerCase() === "y") {
                await addAnother();
            }
        };

        await addAnother();
        return strategies;
    }

    private async configureScalpingStrategy(): Promise<ScalpingStrategy> {
        console.log(`\n⚡ AGGRESSIVE Scalping Strategy Configuration:`);
        console.log(
            `💡 Tip: Aggressive scalping enters on tiny movements, exits quickly`
        );
        console.log(`⚠️  Best for 1m intervals - BE READY FOR FAST ACTION!`);
        console.log(
            `🎯 Strategy: Enter fast, exit faster, catch micro-movements`
        );

        const spreadThreshold = parseFloat(
            (await this.askQuestion(
                "📊 Spread threshold % (default: " +
                    (config.Scalping.spreadThreshold || 1.0) +
                    "): "
            )) || (config.Scalping.spreadThreshold || 1.0).toString()
        );

        const volumeThreshold = parseFloat(
            (await this.askQuestion(
                "📈 Volume spike multiplier (default: " +
                    (config.Scalping.volumeThreshold || 1.1) +
                    "x): "
            )) || (config.Scalping.volumeThreshold || 1.1).toString()
        );

        const quickProfitTarget = parseFloat(
            (await this.askQuestion(
                "💰 Quick profit target % (default: " +
                    (config.Scalping.quickProfitTarget || 0.03) +
                    "%): "
            )) || (config.Scalping.quickProfitTarget || 0.03).toString()
        );

        const maxHoldTime = parseInt(
            (await this.askQuestion(
                "⏰ Max hold time in candles (default: " +
                    (config.Scalping.maxHoldTime || 3) +
                    "): "
            )) || (config.Scalping.maxHoldTime || 3).toString()
        );

        const volatilityPeriod = parseInt(
            (await this.askQuestion(
                "📊 Volatility calculation period (default: " +
                    (config.Scalping.volatilityPeriod || 5) +
                    "): "
            )) || (config.Scalping.volatilityPeriod || 5).toString()
        );

        const minVolatility = parseFloat(
            (await this.askQuestion(
                "🌊 Minimum volatility threshold (default: " +
                    (config.Scalping.minVolatility || 0.0001) +
                    "): "
            )) || (config.Scalping.minVolatility || 0.0001).toString()
        );

        console.log(`\n✅ Scalping Strategy Configured:`);
        console.log(`   📊 Spread Threshold: ${spreadThreshold}%`);
        console.log(`   📈 Volume Threshold: ${volumeThreshold}x average`);
        console.log(`   💰 Profit Target: ${quickProfitTarget}%`);
        console.log(`   ⏰ Max Hold Time: ${maxHoldTime} candles`);
        console.log(`   🌊 Min Volatility: ${minVolatility}`);
        console.log(
            `   🎯 Risk/Reward: 1:2 (${quickProfitTarget}% profit vs ${
                quickProfitTarget * 2
            }% stop loss)`
        );

        return new ScalpingStrategy(
            spreadThreshold,
            volumeThreshold,
            quickProfitTarget,
            maxHoldTime,
            volatilityPeriod,
            minVolatility
        );
    }

    private async configureComboStrategy(): Promise<RSI_MA_ComboStrategy> {
        console.log(`\n🎯 RSI + MA Combo Strategy Configuration:`);
        console.log(`💡 Tip: Combines RSI signals with MA trend confirmation`);

        const rsiPeriod = parseInt(
            (await this.askQuestion(
                "📊 RSI period (default: " + config.RSI_MA.rsiPeriod + "): "
            )) || config.RSI_MA.rsiPeriod.toString()
        );
        const oversold = parseInt(
            (await this.askQuestion(
                "📉 RSI oversold (default: " + config.RSI_MA.rsiOversold + "): "
            )) || config.RSI_MA.rsiOversold.toString()
        );
        const overbought = parseInt(
            (await this.askQuestion(
                "📈 RSI overbought (default: " +
                    config.RSI_MA.rsiOverbought +
                    "): "
            )) || config.RSI_MA.rsiOverbought.toString()
        );
        const shortMA = parseInt(
            (await this.askQuestion(
                "📊 Short MA period (default: " +
                    config.RSI_MA.maShortPeriod +
                    "): "
            )) || config.RSI_MA.maShortPeriod.toString()
        );
        const longMA = parseInt(
            (await this.askQuestion(
                "📊 Long MA period (default: " +
                    config.RSI_MA.maLongPeriod +
                    "): "
            )) || config.RSI_MA.maLongPeriod.toString()
        );

        console.log(
            `✅ Configured: RSI+MA Combo(RSI:${rsiPeriod} ${oversold}/${overbought}, MA:${shortMA}/${longMA})`
        );
        return new RSI_MA_ComboStrategy(
            rsiPeriod,
            oversold,
            overbought,
            shortMA,
            longMA
        );
    }

    private async configureMACDStrategy(): Promise<MACDStrategy> {
        console.log(`\n📊 MACD Strategy Configuration:`);
        console.log(
            `💡 Tip: MACD uses EMA convergence/divergence for trend changes`
        );

        const fastPeriod = parseInt(
            (await this.askQuestion(
                "📈 Fast EMA period (default: " + config.MACD.fastPeriod + "): "
            )) || config.MACD.fastPeriod.toString()
        );
        const slowPeriod = parseInt(
            (await this.askQuestion(
                "📊 Slow EMA period (default: " + config.MACD.slowPeriod + "): "
            )) || config.MACD.slowPeriod.toString()
        );
        const signalPeriod = parseInt(
            (await this.askQuestion(
                "📡 Signal period (default: " + config.MACD.signalPeriod + "): "
            )) || config.MACD.signalPeriod.toString()
        );

        console.log(
            `✅ Configured: MACD(${fastPeriod}, ${slowPeriod}, ${signalPeriod})`
        );
        return new MACDStrategy(fastPeriod, slowPeriod, signalPeriod);
    }

    private async configureScalpingStrategies(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n⚡ Configure Multiple Scalping Strategies:`);
        const addAnother = async (): Promise<void> => {
            strategies.push(await this.configureScalpingStrategy());

            const more = await this.askQuestion(
                "Add another Scalping strategy? (y/N): "
            );
            if (more.toLowerCase() === "y") {
                await addAnother();
            }
        };

        await addAnother();
        return strategies;
    }

    private async configureComboStrategies(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n🎯 Configure Multiple RSI+MA Combo Strategies:`);
        const addAnother = async (): Promise<void> => {
            strategies.push(await this.configureComboStrategy());

            const more = await this.askQuestion(
                "Add another Combo strategy? (y/N): "
            );
            if (more.toLowerCase() === "y") {
                await addAnother();
            }
        };

        await addAnother();
        return strategies;
    }

    private async configureMACDStrategies(): Promise<Strategy[]> {
        const strategies: Strategy[] = [];

        console.log(`\n📊 Configure Multiple MACD Strategies:`);
        const addAnother = async (): Promise<void> => {
            strategies.push(await this.configureMACDStrategy());

            const more = await this.askQuestion(
                "Add another MACD strategy? (y/N): "
            );
            if (more.toLowerCase() === "y") {
                await addAnother();
            }
        };

        await addAnother();
        return strategies;
    }

    private async checkAccountStatus(): Promise<void> {
        if (!this.binanceClient) {
            console.log("❌ Please configure Binance connection first.");
            return;
        }

        try {
            console.log("🔄 Fetching account information...");

            const balances = await this.binanceClient.getAccountBalance();
            const btcPrice = await this.binanceClient.getCurrentPrice(
                "BTCUSDT"
            );

            console.log(`\n💼 Account Balances:`);
            console.log(`📍 BTC Price: ${btcPrice.toFixed(2)}`);
            console.log(`─────────────────────────────────────`);

            let totalUSDTValue = 0;

            for (const balance of balances) {
                const free = parseFloat(balance.free);
                const locked = parseFloat(balance.locked);
                const total = free + locked;

                if (total > 0) {
                    let usdtValue = 0;

                    if (balance.asset === "USDT" || balance.asset === "BUSD") {
                        usdtValue = total;
                    } else if (balance.asset === "BTC") {
                        usdtValue = total * btcPrice;
                    } else {
                        try {
                            const price =
                                await this.binanceClient.getCurrentPrice(
                                    `${balance.asset}USDT`
                                );
                            usdtValue = total * price;
                        } catch {
                            // If can't get price, skip USDT value calculation
                        }
                    }

                    totalUSDTValue += usdtValue;

                    console.log(
                        `${balance.asset.padEnd(8)} | ${total
                            .toFixed(6)
                            .padStart(12)} | ~${usdtValue
                            .toFixed(2)
                            .padStart(8)}`
                    );
                }
            }

            console.log(`─────────────────────────────────────`);
            console.log(
                `💰 Total Portfolio Value: ~${totalUSDTValue.toFixed(2)}`
            );
        } catch (error) {
            console.log("❌ Error fetching account status:", error);
        }
    }

    private async stopBot(): Promise<void> {
        if (!this.currentBot) {
            console.log("❌ No bot is currently running.");
            return;
        }

        console.log("🛑 Stopping trading bot...");
        await this.currentBot.stop();
        this.currentBot = null;
        console.log("✅ Bot stopped successfully.");
    }

    private askQuestion(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    close(): void {
        this.rl.close();
    }
}
