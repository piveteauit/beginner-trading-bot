const { RSI, MACD } = require("technicalindicators");

const strategyConfig = {
  name: "RSI MACD Aggressive",
  description:
    "Utilise le RSI et le MACD sur un timeframe de 5 minutes pour détecter les points d'achat et de vente.",
  parameters: {
    rsi_period: 7, // Période plus courte
    macd_fast_period: 6, // Période plus courte
    macd_slow_period: 13, // Période plus courte
    macd_signal_period: 5, // Période plus courte
    rsi_overbought: 65, // Seuil plus bas
    rsi_oversold: 35, // Seuil plus haut
    stop_loss_pct: 0.1,
    take_profit_pct: 0.5,
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

module.exports = { strategyConfig, detectSignal };
