# 🤖 Crypto Trading Bot

A simple cryptocurrency trading bot built with TypeScript that supports multiple trading strategies, backtesting, and both demo and live trading on Binance.

## ✨ Features

- **Multiple Trading Strategies**: 6 different algorithmic trading strategies
- **Backtesting Engine**: Test strategies against historical data
- **Strategy Comparison**: Compare multiple strategies side-by-side
- **Demo Trading**: Paper trading with real market data
- **Live Trading**: Execute real trades on Binance (with safety controls)
- **Interactive CLI**: User-friendly command-line interface
- **Risk Management**: Built-in stop-loss and position sizing
- **Real-time Analysis**: Continuous market monitoring and signal generation

## 🚀 Quick Start

### Prerequisites

- Node.js
- npm or yarn
- Binance account with API keys (for live trading)

### Installation

1. Clone the repository:

DISCLAIMER: This software is for educational and experimental purposes only.DISCLAIMER: This software is for educational and experimental purposes only.

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your Binance API credentials
```

4. Start the interactive CLI:

```bash
npm run live
```

## 📊 Trading Strategies

### 1. Moving Average Crossover

Classic trend-following strategy using short and long period moving averages.

- **Parameters**: Short period (default: 12), Long period (default: 26)
- **Best for**: Trending markets
- **Signals**: Golden Cross (buy), Death Cross (sell)

### 2. RSI Strategy

Momentum oscillator strategy based on Relative Strength Index.

- **Parameters**: Period (default: 14), Oversold (30), Overbought (70)
- **Best for**: Range-bound markets
- **Signals**: RSI crosses above/below thresholds

### 3. Bollinger Bands

Volatility-based strategy using statistical price channels.

- **Parameters**: Period (default: 20), Standard Deviations (2.0)
- **Best for**: Mean reversion trading
- **Signals**: Price touches upper/lower bands

### 4. Scalping Strategy

High-frequency trading strategy for quick profits.

- **Parameters**: Spread threshold, Volume threshold, Quick profit target
- **Best for**: High-volume, liquid markets
- **Signals**: Micro price movements with volume confirmation

### 5. RSI + MA Combo

Combined strategy using both RSI and Moving Average signals.

- **Parameters**: RSI settings + MA periods
- **Best for**: Reducing false signals
- **Signals**: Multi-condition confirmations

### 6. MACD Strategy

Moving Average Convergence Divergence momentum strategy.

- **Parameters**: Fast EMA (12), Slow EMA (26), Signal (9)
- **Best for**: Trend changes and momentum shifts
- **Signals**: MACD line crosses signal line

## 🛠️ Usage

### Interactive CLI Menu

The bot provides an intuitive command-line interface with the following options:

1. **Configure Binance Connection** - Set up API credentials
2. **Run Strategy Comparison** - Backtest multiple strategies
3. **Start Demo Trading** - Paper trading with real data
4. **Start Live Trading** - Execute real trades (⚠️ **REAL MONEY**)
5. **Check Account Status** - View balances and positions
6. **Stop Current Bot** - Halt trading operations

### Backtesting

```bash
# The CLI will guide you through:
# 1. Selecting trading pair (e.g., BTCUSDT)
# 2. Choosing time interval (1m, 5m, 1h, etc.)
# 3. Setting data points for analysis
# 4. Selecting strategies to compare
```

### Demo Trading

Safe paper trading that:

- Uses real market data
- Simulates trades without risk
- Tracks performance metrics
- No real money involved

### Live Trading

⚠️ **WARNING**: Live trading involves real money and risk.

Safety features:

- Requires explicit confirmation
- Testnet support for safe testing
- Manual activation required
- Built-in risk management

## 🏗️ Project Structure

```
src/
├── backtesting/           # Backtesting engine and strategy comparison
│   ├── Backtester.ts     # Core backtesting logic
│   └── StrategyComparator.ts
├── cli/                   # Interactive command-line interface
│   └── InteractiveCLI.ts
├── config/               # Configuration and parameters
│   └── parametersConfig.json
├── exchanges/            # Exchange integrations
│   └── BinanceClient.ts  # Binance API client
├── strategies/           # Trading strategies
│   ├── Strategy.ts       # Base strategy interface
│   ├── MovingAverageCrossover.ts
│   ├── RSIStrategy.ts
│   ├── BollingerBandsStrategy.ts
│   ├── ScalpingStrategy.ts
│   ├── RSI_MA_ComboStrategy.ts
│   └── MACDStrategy.ts
└── trading/              # Trading execution
    ├── TradingBot.ts     # Main bot controller
    ├── DemoTrader.ts     # Paper trading
    └── LiveTrader.ts     # Live trading
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with:

```bash
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here
BINANCE_TESTNET=true  # Set to false for mainnet
```

### Strategy Parameters

Default parameters are defined in `src/config/parametersConfig.json`. You can modify these or configure them through the CLI.

## 📈 Performance Metrics

The bot tracks comprehensive performance metrics:

- **Total Return**: Overall profit/loss percentage
- **Win Rate**: Percentage of profitable trades
- **Total Trades**: Number of executed trades
- **Max Drawdown**: Largest peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted return measure

## 🛡️ Risk Management

Built-in safety features:

- **Position Sizing**: Automatic trade amount calculation
- **Stop Loss**: Configurable maximum loss per trade
- **Max Drawdown Limits**: Portfolio protection
- **Demo Mode Default**: Safe testing environment
- **Testnet Support**: Practice with fake money

## 🔧 Development

### Scripts

```bash
npm run build     # Compile TypeScript
npm run start     # Run the backtester with deafult configs
npm run live      # Run live CLI
```

### Adding New Strategies

1. Create a new strategy class extending `Strategy`
2. Implement the `analyze()` method
3. Add it to the CLI strategy selection
4. Update configuration if needed

Example:

```typescript
export class MyStrategy extends Strategy {
  analyze(candles: Candle[]): Signal {
    // Your strategy logic here
    return {
      type: "BUY" | "SELL" | "HOLD",
      price: currentPrice,
      timestamp: new Date(),
      confidence: 0.8,
    };
  }
}
```

## ⚠️ Important Disclaimers

- **Trading Risk**: Cryptocurrency trading involves substantial risk of loss
- **No Guarantees**: Past performance does not guarantee future results
- **Use at Your Own Risk**: This software is provided as-is without warranties
- **Test First**: Always use demo mode and testnet before live trading
- **API Security**: Keep your API keys secure and use IP restrictions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript and Node.js
- Integrates with Binance API
- Inspired by algorithmic trading principles
- Community feedback and contributions

## 📞 Support

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information for better support

---

**⚠️ Trading cryptocurrencies involves significant risk. Only trade with money you can afford to lose. This bot is for educational and experimental purposes.**
