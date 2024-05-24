const { SMA } = require("technicalindicators");

const strategyConfig = {
  name: "Moving Average Cross",
  description: "Utilise les croisements des moyennes mobiles pour détecter les points d'achat et de vente.",
  parameters: {
    short_period: 50,
    long_period: 200,
    stop_loss_pct: 0.01,
    take_profit_pct: 0.1,
    leverage: 50,
    max_trade_pct: 0.25
  }
};

function detectSignal(prices, parameters) {
  const shortSMA = SMA.calculate({ period: parameters.short_period, values: prices });
  const longSMA = SMA.calculate({ period: parameters.long_period, values: prices });
  
  if (shortSMA.length < 2 || longSMA.length < 2) return null;

  const lastPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];
  const lastShortSMA = shortSMA[shortSMA.length - 1];
  const prevShortSMA = shortSMA[shortSMA.length - 2];
  const lastLongSMA = longSMA[longSMA.length - 1];
  const prevLongSMA = longSMA[longSMA.length - 2];

  const goldenCross = prevShortSMA < prevLongSMA && lastShortSMA > lastLongSMA;
  const deathCross = prevShortSMA > prevLongSMA && lastShortSMA < lastLongSMA;

  if (goldenCross) {
    return { action: "buy", price: lastPrice };
  } else if (deathCross) {
    return { action: "sell", price: lastPrice };
  } else {
    return null;
  }
}

module.exports = { strategyConfig, detectSignal };
