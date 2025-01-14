import { RESTClient } from "../../advanced-sdk-ts/src/rest";
import {
    Action,
    Plugin,
    elizaLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    Provider,
} from "@elizaos/core";
import { advancedTradeTemplate } from "../templates";
import { isAdvancedTradeContent, AdvancedTradeSchema } from "../types";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createArrayCsvWriter } from "csv-writer";
import {
    OrderSide,
    OrderConfiguration,
    Position,
    PortfolioType,
} from "../../advanced-sdk-ts/src/rest/types/common-types";
import { CreateOrderResponse } from "../../advanced-sdk-ts/src/rest/types/orders-types";

// File path setup remains the same
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const tradeCsvFilePath = path.join(baseDir, "advanced_trades.csv");

const tradeProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.debug("Starting tradeProvider function");
        try {
            const client = new RESTClient(
                runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY
            );

            // Get accounts and products information
            let accounts, products;
            try {
                accounts = await client.listAccounts({});
            } catch (error) {
                elizaLogger.error("Error fetching accounts:", error);
                return [];
            }

            try {
                products = await client.listProducts({});
            } catch (error) {
                elizaLogger.error("Error fetching products:", error);
                return [];
            }

            // Read CSV file logic remains the same
            if (!fs.existsSync(tradeCsvFilePath)) {
                const csvWriter = createArrayCsvWriter({
                    path: tradeCsvFilePath,
                    header: [
                        "Order ID",
                        "Success",
                        "Order Configuration",
                        "Response",
                    ],
                });
                await csvWriter.writeRecords([]);
            }

            let csvData, records;
            try {
                csvData = await readFile(tradeCsvFilePath, "utf-8");
            } catch (error) {
                elizaLogger.error("Error reading CSV file:", error);
                return [];
            }

            try {
                records = parse(csvData, {
                    columns: true,
                    skip_empty_lines: true,
                });
            } catch (error) {
                elizaLogger.error("Error parsing CSV data:", error);
                return [];
            }

            return {
                accounts: accounts.accounts,
                products: products.products,
                trades: records,
            };
        } catch (error) {
            elizaLogger.error("Error in tradeProvider:", error);
            return [];
        }
    },
};

async function calculatePnl(client: RESTClient, amount: number): Promise<number> {
    const accounts = JSON.parse(await client.listAccounts({})).accounts;
    elizaLogger.info("Accounts:", accounts);

    const btcAccount = accounts.find(account => account.currency === "BTC");
    elizaLogger.info("BTC Account:", btcAccount);
    const btcBalance = parseFloat(btcAccount?.available_balance?.value);
    elizaLogger.info("BTC Balance:", btcBalance);

    const ethAccount = accounts.find(account => account.currency === "ETH");
    elizaLogger.info("ETH Account:", ethAccount);
    const ethBalance = parseFloat(ethAccount?.available_balance?.value);
    elizaLogger.info("ETH Balance:", ethBalance);

    const usdAccount = accounts.find(account => account.currency === "USD");
    elizaLogger.info("USD Account:", usdAccount);
    const usdBalance = parseFloat(usdAccount?.available_balance?.value);
    elizaLogger.info("USD Balance:", usdBalance);

    const btcPrice = await getPrice(client, "BTC-USD");
    elizaLogger.info("BTC Price:", btcPrice);
    const ethPrice = await getPrice(client, "ETH-USD");
    elizaLogger.info("ETH Price:", ethPrice);

    const btcUSD = btcBalance * btcPrice;
    elizaLogger.info("BTC USD:", btcUSD);
    const ethUSD = ethBalance * ethPrice;
    const totalValueUSD = btcUSD + ethUSD + usdBalance;
    elizaLogger.info("Total Value USD:", totalValueUSD);

    const pnl = totalValueUSD - amount;
    return pnl;
}

export const pnlProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory) => {
        const client = new RESTClient(
            runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
            runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY
        );
        const portfolios = JSON.parse(await client.listPortfolios({portfolioType: PortfolioType.DEFAULT}));
        elizaLogger.info("Portfolios:", portfolios);
        const portfolioId = portfolios.portfolios[0].uuid;
        elizaLogger.info("Portfolio ID:", portfolioId);
        if (!portfolioId) {
            elizaLogger.error("Portfolio ID is not set");
            return { realizedPnl: 0, unrealizedPnl: 0 };
        }
        // Need to manually set the amount and calculate as endpoints not accessible for portfolios
        const pnl = await calculatePnl(client, 1000);
        elizaLogger.info("Pnl:", pnl);
        return pnl
    }
}

export async function appendTradeToCsv(tradeResult: any) {
    elizaLogger.debug("Starting appendTradeToCsv function");
    try {
        const csvWriter = createArrayCsvWriter({
            path: tradeCsvFilePath,
            header: ["Order ID", "Success", "Order Configuration", "Response"],
            append: true,
        });
        elizaLogger.info("Trade result:", tradeResult);

        // Format trade data based on success/failure
        const formattedTrade = [
            tradeResult.success_response?.order_id ||
                tradeResult.failure_response?.order_id ||
                "",
            tradeResult.success,
            JSON.stringify(tradeResult.order_configuration || {}),
            JSON.stringify(tradeResult.success_response || tradeResult.failure_response || {})
        ];

        elizaLogger.info("Formatted trade for CSV:", formattedTrade);
        await csvWriter.writeRecords([formattedTrade]);
        elizaLogger.info("Trade written to CSV successfully");
    } catch (error) {
        elizaLogger.error("Error writing trade to CSV:", error);
        // Log the actual error for debugging
        if (error instanceof Error) {
            elizaLogger.error("Error details:", error.message);
        }
    }
}

async function hasEnoughBalance(
    client: RESTClient,
    currency: string,
    amount: number,
    side: string
): Promise<boolean> {
    elizaLogger.debug("Starting hasEnoughBalance function");
    try {
        const response = await client.listAccounts({});
        const accounts = JSON.parse(response);
        const checkCurrency = side === "BUY" ? "USD" : currency;
        elizaLogger.info(
            `Checking balance for ${side} order of ${amount} ${checkCurrency}`
        );

        // Find account with exact currency match
        const account = accounts?.accounts.find(
            (acc) =>
                acc.currency === checkCurrency &&
                (checkCurrency === "USD"
                    ? acc.type === "ACCOUNT_TYPE_FIAT"
                    : acc.type === "ACCOUNT_TYPE_CRYPTO")
        );

        if (!account) {
            elizaLogger.error(`No ${checkCurrency} account found`);
            return false;
        }

        const available = parseFloat(account.available_balance.value);
        // Add buffer for fees only on USD purchases
        const requiredAmount = side === "BUY" ? amount * 1.01 : amount;
        elizaLogger.info(
            `Required amount (including buffer): ${requiredAmount} ${checkCurrency}`
        );

        const hasBalance = available >= requiredAmount;
        elizaLogger.info(`Has sufficient balance: ${hasBalance}`);

        return hasBalance;
    } catch (error) {
        elizaLogger.error("Balance check failed with error:", {
            error: error instanceof Error ? error.message : "Unknown error",
            currency,
            amount,
            side,
        });
        return false;
    }
}

export async function getPrice(client: RESTClient, productId: string) {
    elizaLogger.debug("Fetching product info for productId:", productId);
    try {
        const productInfo = await client.getProduct({productId});
        const price = JSON.parse(productInfo)?.price;
        elizaLogger.info("Product info retrieved:", productInfo);
        elizaLogger.info("Price:", price);
        return Number(price);
    } catch (error) {
        elizaLogger.error("Error fetching product info:", error);
        return null;
    }
}

export async function getPricUSD(runtime: IAgentRuntime, productId: string) {
    const client = new RESTClient(
        runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
        runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY
    );
    elizaLogger.debug("Fetching product info for productId:", productId);
    try {
        const productInfo = await client.getProduct({productId});
        const price = JSON.parse(productInfo)?.price;
        elizaLogger.info("Product info retrieved:", productInfo);
        elizaLogger.info("Price:", price);
        return Number(price);
    } catch (error) {
        elizaLogger.error("Error fetching product info:", error);
        return null;
    }
}

export const executeAdvancedTradeAction: Action = {
    name: "EXECUTE_ADVANCED_TRADE",
    description: "Execute a trade using Coinbase Advanced Trading API",
    validate: async (runtime: IAgentRuntime) => {
        return (
            !!(
                runtime.getSetting("COINBASE_API_KEY") ||
                process.env.COINBASE_API_KEY
            ) &&
            !!(
                runtime.getSetting("COINBASE_PRIVATE_KEY") ||
                process.env.COINBASE_PRIVATE_KEY
            )
        );
    },
    similes: [
        "EXECUTE_ADVANCED_TRADE",
        "ADVANCED_MARKET_ORDER",
        "ADVANCED_LIMIT_ORDER",
        "COINBASE_PRO_TRADE",
        "PROFESSIONAL_TRADE",
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        let client: RESTClient;

        // Initialize client
        elizaLogger.debug("Starting advanced trade client initialization");
        try {
            client = new RESTClient(
                runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY
            );
            elizaLogger.info("Advanced trade client initialized");
        } catch (error) {
            elizaLogger.error("Client initialization failed:", error);
            callback(
                {
                    text: "Failed to initialize trading client. Please check your API credentials.",
                },
                []
            );
            return;
        }

        // Generate trade details
        let tradeDetails;
        const updatedState = state;
        updatedState.message = message.content.text;
        elizaLogger.debug("Starting trade details generation");
        try {
            tradeDetails = await generateObject({
                runtime,
                context: composeContext({
                    state: updatedState,
                    template: advancedTradeTemplate,
                }),
                modelClass: ModelClass.LARGE,
                schema: AdvancedTradeSchema,
            });
            elizaLogger.info("Trade details generated:", tradeDetails.object);
        } catch (error) {
            elizaLogger.error("Trade details generation failed:", error);
            callback(
                {
                    text: "Failed to generate trade details. Please provide valid trading parameters.",
                },
                []
            );
            return;
        }

        // Validate trade content
        if (!isAdvancedTradeContent(tradeDetails.object)) {
            elizaLogger.error("Invalid trade content:", tradeDetails.object);
            callback(
                {
                    text: "Invalid trade details. Please check your input parameters.",
                },
                []
            );
            return;
        }

        const { productId, amount, side, orderType, limitPrice } =
            tradeDetails.object;
        let amountInCurrency = amount;
        // Configure order
        let orderConfiguration: OrderConfiguration;
        elizaLogger.debug("Starting order configuration", {productId, amount, side, orderType, limitPrice});
        try {
            if (orderType === "MARKET") {
                const priceInUSD = await getPrice(client, productId);
                elizaLogger.info("Price:", priceInUSD);
                if (side === "SELL") {
                    amountInCurrency = parseFloat(((1 / priceInUSD) * amountInCurrency).toFixed(7));
                }
                elizaLogger.info("Amount in currency:", amountInCurrency);
                orderConfiguration =
                    side === "BUY"
                        ? {
                              market_market_ioc: {
                                  quote_size: amountInCurrency.toString(),
                              },
                          }
                        : {
                              market_market_ioc: {
                                  base_size: amountInCurrency.toString(),
                              },
                          };
            } else {
                if (!limitPrice) {
                    throw new Error("Limit price is required for limit orders");
                }
                orderConfiguration = {
                    limit_limit_gtc: {
                        baseSize: amountInCurrency.toString(),
                        limitPrice: limitPrice.toString(),
                        postOnly: false,
                    },
                };
            }
            elizaLogger.info(
                "Order configuration created:",
                orderConfiguration
            );
        } catch (error) {
            elizaLogger.error("Order configuration failed:", error);
            callback(
                {
                    text:
                        error instanceof Error
                            ? error.message
                            : "Failed to configure order parameters.",
                },
                []
            );
            return;
        }

        // Execute trade
        let order: CreateOrderResponse;
        try {
            elizaLogger.debug("Executing the trade");
            if (
                !(await hasEnoughBalance(
                    client,
                    productId.split("-")[0],
                    amountInCurrency,
                    side
                ))
            ) {
                callback(
                    {
                        text: `Insufficient ${side === "BUY" ? "USD" : productId.split("-")[0]} balance to execute this trade`,
                    },
                    []
                );
                return;
            }
            const orderId = crypto.randomUUID();
            order = JSON.parse(await client.createOrder({
                clientOrderId: orderId,
                productId,
                side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
                orderConfiguration,
            }));
            elizaLogger.info("Order:", JSON.stringify(order));
            if (order.success) {
                elizaLogger.info("Trade executed successfully:", JSON.stringify(order));
            callback(
                {
                    text: `Trade executed successfully: ${JSON.stringify(order)}`,
                },
                []
            );
            elizaLogger.info("Trade executed successfully:", order);
            } else {
                elizaLogger.error("Trade execution failed:", (order as any)?.error_response?.message);
                callback(
                    {
                        text: `Failed to execute trade: ${(order as any)?.error_response?.message ?? "Unknown error occurred"}`,
                    },
                    []
                );
            }
        } catch (error) {
            elizaLogger.error("Trade execution failed:", error?.message);
            callback(
                {
                    text: `Failed to execute trade: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
                },
                []
            );
            return;
        }
        // Log trade to CSV
        try {
            await appendTradeToCsv(order);
            elizaLogger.info("Trade logged to CSV");
        } catch (csvError) {
            elizaLogger.warn("Failed to log trade to CSV:", csvError);
            // Continue execution as this is non-critical
        }

        callback(
            {
                text: `Advanced Trade executed successfully:
- Product: ${productId}
- Type: ${orderType} Order
- Side: ${side}
- Amount: ${amountInCurrency}
- ${orderType === "LIMIT" ? `- Limit Price: ${limitPrice}\n` : ""} Order ID: ${order.order_id}
- Status: ${order.success}
- Order Id:  ${order.order_id}
- Response: ${JSON.stringify(order.response)}
- Order Configuration: ${JSON.stringify(order.order_configuration)}`,
            },
            []
        );
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Place an advanced market order to buy $1 worth of BTC",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Advanced Trade executed successfully:
- Product: BTC-USD
- Type: Market Order
- Side: BUY
- Amount: 1000
- Order ID: CB-ADV-12345
- Success: true
- Response: {"success_response":{}}
- Order Configuration: {"market_market_ioc":{"quote_size":"1000"}}`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Place an advanced market order to sell $1 USD worth of BTC",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Advanced Trade executed successfully:
- Product: BTC-USD
- Type: Market Order
- Side: BUY
- Amount: 1000
- Order ID: CB-ADV-12345
- Success: true
- Response: {"success_response":{}}
- Order Configuration: {"market_market_ioc":{"quote_size":"1000"}}`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Set a limit order to sell 0.5 ETH at $2000" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Advanced Trade executed successfully:
- Product: ETH-USD
- Type: Limit Order
- Side: SELL
- Amount: 0.5
- Limit Price: 2000
- Order ID: CB-ADV-67890
- Success: true
- Response: {"success_response":{}}
- Order Configuration: {"limit_limit_gtc":{"baseSize":"0.5","limitPrice":"2000","postOnly":false}}`,
                },
            },
        ],
    ],
};

export const advancedTradePlugin: Plugin = {
    name: "advancedTradePlugin",
    description: "Enables advanced trading using Coinbase Advanced Trading API",
    actions: [executeAdvancedTradeAction],
    providers: [tradeProvider, pnlProvider],
};
