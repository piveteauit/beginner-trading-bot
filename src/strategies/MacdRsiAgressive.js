const { RSI, MACD } = require("technicalindicators");

const strategyConfig = {
  name: "RSI MACD Aggressive",
  description:
    "Utilise le RSI et le MACD sur un timeframe de 5 minutes pour détecter les points d'achat et de vente.",
  parameters: {
    rsi_period: 14,
    macd_fast_period: 12,
    macd_slow_period: 26,
    macd_signal_period: 9,
    rsi_overbought: 70,
    rsi_oversold: 30,
    stop_loss_pct: 0.01,
    take_profit_pct: 0.05,
    leverage: 50,
    max_trade_pct: 0.3,
  },
};

function detectSignal(prices, parameters) {
  const rsi = RSI.calculate({ period: parameters.rsi_period, values: prices });
  const macd = MACD.calculate({
    values: prices,
    fastPeriod: parameters.macd_fast_period,
    slowPeriod: parameters.macd_slow_period,
    signalPeriod: parameters.macd_signal_period,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (rsi.length < 2 || macd.length < 2) return null;

  const lastPrice = prices[prices.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const lastMACD = macd[macd.length - 1];

  const buySignal =
    lastRSI < parameters.rsi_oversold && lastMACD.MACD > lastMACD.signal;
  const sellSignal =
    lastRSI > parameters.rsi_overbought && lastMACD.MACD < lastMACD.signal;

  if (buySignal) {
    return { action: "buy", price: lastPrice };
  } else if (sellSignal) {
    return { action: "sell", price: lastPrice };
  } else {
    return null;
  }
}

function managePosition(position, currentPrice, parameters) {
  const { entryPrice, size, side } = position;
  const takeProfitPrice =
    side === "buy"
      ? entryPrice * (1 + parameters.take_profit_pct)
      : entryPrice * (1 - parameters.take_profit_pct);
  const stopLossPrice =
    side === "buy"
      ? entryPrice * (1 - parameters.stop_loss_pct)
      : entryPrice * (1 + parameters.stop_loss_pct);

  if (
    (side === "buy" && currentPrice >= takeProfitPrice) ||
    (side === "sell" && currentPrice <= takeProfitPrice)
  ) {
    return { action: side === "buy" ? "sell" : "buy", tradeSize: size };
  } else if (
    (side === "buy" && currentPrice <= stopLossPrice) ||
    (side === "sell" && currentPrice >= stopLossPrice)
  ) {
    return { action: side === "buy" ? "sell" : "buy", tradeSize: size };
  }
  return null;
}

module.exports = { strategyConfig, detectSignal, managePosition };
