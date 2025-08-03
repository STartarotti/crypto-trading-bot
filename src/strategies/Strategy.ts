export interface Signal {
    type: "BUY" | "SELL" | "HOLD";
    price: number;
    timestamp: Date;
    confidence: number; // 0-1
    metadata?: any;
}

export interface Candle {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export abstract class Strategy {
    protected name: string;
    protected parameters: Record<string, any>;

    constructor(name: string, parameters: Record<string, any> = {}) {
        this.name = name;
        this.parameters = parameters;
    }

    abstract analyze(candles: Candle[]): Signal;

    getName(): string {
        return this.name;
    }

    getParameters(): Record<string, any> {
        return this.parameters;
    }
}
