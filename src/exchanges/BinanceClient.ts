import axios from "axios";
import crypto from "crypto";
import { Candle } from "../strategies/Strategy";

export interface BinanceConfig {
    apiKey: string;
    secretKey: string;
    testnet: boolean;
    baseURL?: string;
}

export interface OrderResult {
    symbol: string;
    orderId: number;
    side: "BUY" | "SELL";
    quantity: string;
    price: string;
    status: string;
    executedQty: string;
    fills?: any[];
}

export interface AccountBalance {
    asset: string;
    free: string;
    locked: string;
}

export class BinanceClient {
    private config: BinanceConfig;
    private httpClient: Axios.AxiosInstance;
    private baseURL: string;

    constructor(config: BinanceConfig) {
        this.config = config;
        this.baseURL = config.testnet
            ? "https://testnet.binance.vision/api"
            : "https://api.binance.com/api";

        this.httpClient = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
        });
    }

    private createSignature(queryString: string): string {
        return crypto
            .createHmac("sha256", this.config.secretKey)
            .update(queryString)
            .digest("hex");
    }

    private createAuthHeaders(
        params: Record<string, any> = {}
    ): Record<string, string> {
        const timestamp = Date.now();
        const queryString = new URLSearchParams({
            ...params,
            timestamp: timestamp.toString(),
        }).toString();

        const signature = this.createSignature(queryString);

        return {
            "X-MBX-APIKEY": this.config.apiKey,
        };
    }

    async getAccountBalance(): Promise<AccountBalance[]> {
        try {
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = this.createSignature(queryString);

            const response = await this.httpClient.get("/v3/account", {
                params: { timestamp, signature },
                headers: this.createAuthHeaders(),
            });

            return (response.data as any).balances.filter(
                (balance: any) =>
                    parseFloat(balance.free) > 0 ||
                    parseFloat(balance.locked) > 0
            );
        } catch (error: any) {
            console.error(
                "❌ Error fetching account balance:",
                error.response?.data || error.message
            );
            throw error;
        }
    }

    async getCurrentPrice(symbol: string): Promise<number> {
        try {
            const response = await this.httpClient.get("/v3/ticker/price", {
                params: { symbol: symbol.toUpperCase() },
            });
            return parseFloat((response.data as any).price);
        } catch (error: any) {
            console.error(
                "❌ Error fetching current price:",
                error.response?.data || error.message
            );
            throw error;
        }
    }

    async getRecentTrades(symbol: string, limit: number = 10): Promise<any[]> {
        try {
            const response = await this.httpClient.get("/v3/myTrades", {
                params: { symbol: symbol.toUpperCase(), limit },
                headers: this.createAuthHeaders(),
            });
            return response.data as any;
        } catch (error: any) {
            console.error(
                "❌ Error fetching recent trades:",
                error.response?.data || error.message
            );
            throw error;
        }
    }

    async marketBuy(
        symbol: string,
        quoteOrderQty: number
    ): Promise<OrderResult> {
        try {
            const timestamp = Date.now();
            const params = {
                symbol: symbol.toUpperCase(),
                side: "BUY",
                type: "MARKET",
                quoteOrderQty: quoteOrderQty.toFixed(2),
                timestamp,
            };

            const queryString = new URLSearchParams(params as any).toString();
            const signature = this.createSignature(queryString);

            const response = await this.httpClient.post("/v3/order", null, {
                params: { ...params, signature },
                headers: this.createAuthHeaders(),
            });

            console.log(
                `✅ Market BUY order executed: ${
                    (response.data as any).executedQty
                } ${symbol} for $${quoteOrderQty}`
            );
            return response.data as any;
        } catch (error: any) {
            console.error(
                "❌ Error executing market buy:",
                error.response?.data || error.message
            );
            throw error;
        }
    }

    async marketSell(symbol: string, quantity: number): Promise<OrderResult> {
        try {
            const timestamp = Date.now();
            const params = {
                symbol: symbol.toUpperCase(),
                side: "SELL",
                type: "MARKET",
                quantity: quantity.toFixed(6),
                timestamp,
            };

            const queryString = new URLSearchParams(params as any).toString();
            const signature = this.createSignature(queryString);

            const response = await this.httpClient.post("/v3/order", null, {
                params: { ...params, signature },
                headers: this.createAuthHeaders(),
            });

            console.log(`✅ Market SELL order executed: ${quantity} ${symbol}`);
            return response.data as any;
        } catch (error: any) {
            console.error(
                "❌ Error executing market sell:",
                error.response?.data || error.message
            );
            throw error;
        }
    }

    async getHistoricalKlines(
        symbol: string,
        interval: string,
        limit: number
    ): Promise<Candle[]> {
        try {
            const response = await this.httpClient.get("/v3/klines", {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval,
                    limit,
                },
            });

            return (response.data as any).map((kline: any[]) => ({
                timestamp: new Date(kline[0]),
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
            }));
        } catch (error: any) {
            console.error(
                "❌ Error fetching historical klines:",
                error.response?.data || error.message
            );
            throw error;
        }
    }
}
