import { Candle } from "../strategies/Strategy";
import axios from "axios";

export class DataProvider {
    async getHistoricalData(
        symbol: string,
        interval: string = "1h",
        limit: number = 1000
    ): Promise<Candle[]> {
        try {
            // Using Binance public API for historical data
            const response = await axios.get(
                `https://api.binance.com/api/v3/klines`,
                {
                    params: {
                        symbol: symbol.toUpperCase(),
                        interval,
                        limit,
                    },
                }
            );

            return (response.data as any).map((kline: any[]) => ({
                timestamp: new Date(kline[0]),
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
            }));
        } catch (error) {
            console.error("Error fetching historical data:", error);
            throw error;
        }
    }

    // Generate sample data for testing with more realistic trends
    generateSampleData(days: number = 100): Candle[] {
        const candles: Candle[] = [];
        let price = 50000; // Starting price
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Create more realistic market movements with trends
        let trend = 0.001; // Start with slight uptrend
        let trendCounter = 0;

        for (let i = 0; i < days * 24; i++) {
            // Hourly candles
            const timestamp = new Date(
                startDate.getTime() + i * 60 * 60 * 1000
            );

            // Change trend every 100-200 candles to create crossovers
            trendCounter++;
            if (trendCounter > 100 + Math.random() * 100) {
                trend = (Math.random() - 0.5) * 0.003; // Random trend between -0.15% and +0.15%
                trendCounter = 0;
            }

            // Apply trend + random noise
            const trendChange = trend + (Math.random() - 0.5) * 0.015; // ±0.75% random + trend
            const open = price;
            const close = price * (1 + trendChange);
            const high = Math.max(open, close) * (1 + Math.random() * 0.005);
            const low = Math.min(open, close) * (1 - Math.random() * 0.005);
            const volume = 800 + Math.random() * 400; // More consistent volume

            candles.push({
                timestamp,
                open,
                high,
                low,
                close,
                volume,
            });

            price = close;
        }

        return candles;
    }
}
