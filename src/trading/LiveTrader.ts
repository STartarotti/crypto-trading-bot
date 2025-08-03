import { BinanceClient } from "../exchanges/BinanceClient";
import { Strategy, Signal, Candle } from "../strategies/Strategy";

export class LiveTrader {
    private binanceClient: BinanceClient;
    private isActive: boolean = false;

    constructor(binanceClient: BinanceClient) {
        this.binanceClient = binanceClient;
    }

    async executeTrade(
        signal: Signal,
        symbol: string,
        tradeAmount: number
    ): Promise<boolean> {
        try {
            if (!this.isActive) {
                console.log("⚠️ Live trading is not active");
                return false;
            }

            if (signal.type === "BUY") {
                const result = await this.binanceClient.marketBuy(
                    symbol,
                    tradeAmount
                );
                return result.status === "FILLED";
            } else if (signal.type === "SELL") {
                // Get current position to sell
                const balances = await this.binanceClient.getAccountBalance();
                const baseAsset = symbol
                    .replace("USDT", "")
                    .replace("BUSD", "");
                const assetBalance = balances.find(
                    (b) => b.asset === baseAsset
                );

                if (assetBalance && parseFloat(assetBalance.free) > 0) {
                    const quantity = parseFloat(assetBalance.free);
                    const result = await this.binanceClient.marketSell(
                        symbol,
                        quantity
                    );
                    return result.status === "FILLED";
                }
            }

            return false;
        } catch (error) {
            console.error("❌ Live trade execution error:", error);
            return false;
        }
    }

    activate(): void {
        this.isActive = true;
        console.log("🔴 LIVE TRADING ACTIVATED - Real money at risk!");
    }

    deactivate(): void {
        this.isActive = false;
        console.log("⏸️ Live trading deactivated");
    }

    isLiveActive(): boolean {
        return this.isActive;
    }
}
