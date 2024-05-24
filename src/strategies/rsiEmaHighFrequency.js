const { EMA, RSI } = require("technicalindicators");

const strategyConfig = {
  name: "RSI + EMA High Frequency",
  description: "Utilise RSI et EMA pour détecter les points d'entrée et de sortie fréquents.",
  parameters: {
    rsi_period: 14,
    ema_short_period: 9,
    ema_long_period: 21,
    rsi_overbought: 70,
    rsi_oversold: 30,
    stop_loss_pct: 0.003,
    take_profit_pct: 0.005,
    leverage: 50,
    max_trade_pct: 0.02
  }
};

function detectSignal(prices, parameters) {
  const rsi = RSI.calculate({ period: parameters.rsi_period, values: prices });
  const emaShort = EMA.calculate({ period: parameters.ema_short_period, values: prices });
  const emaLong = EMA.calculate({ period: parameters.ema_long_period, values: prices });

  if (rsi.length < 2 || emaShort.length < 2 || emaLong.length < 2) return null;

  const lastPrice = prices[prices.length - 1];
  const lastRSI = rsi[rsi.length - 1];
  const lastEmaShort = emaShort[emaShort.length - 1];
  const lastEmaLong = emaLong[emaLong.length - 1];

  const bullishSignal = lastRSI < parameters.rsi_oversold && lastEmaShort > lastEmaLong;
  const bearishSignal = lastRSI > parameters.rsi_overbought && lastEmaShort < lastEmaLong;

  if (bullishSignal) {
    return { action: "buy", price: lastPrice };
  } else if (bearishSignal) {
    return { action: "sell", price: lastPrice };
  } else {
    return null;
  }
}

module.exports = { strategyConfig, detectSignal };
