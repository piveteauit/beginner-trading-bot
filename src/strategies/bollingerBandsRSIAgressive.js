const { BollingerBands, RSI } = require("technicalindicators");

const strategyConfig = {
  name: "Bollinger Bands + RSI Agressive",
  description: "Utilise les bandes de Bollinger et le RSI pour des trades agressifs.",
  parameters: {
    bollinger_period: 14,
    stdDev: 2,
    rsi_period: 7,
    rsi_overbought: 80,
    rsi_oversold: 20,
    stop_loss_pct: 0.005,
    take_profit_pct: 0.01,
    leverage: 50,
    max_trade_pct: 0.1
  }
};

function detectSignal(prices, parameters) {
  const bollingerBands = BollingerBands.calculate({
    period: parameters.bollinger_period,
    stdDev: parameters.stdDev,
    values: prices
  });

  const rsi = RSI.calculate({ period: parameters.rsi_period, values: prices });

  if (bollingerBands.length < 2 || rsi.length < 2) return null;

  const lastPrice = prices[prices.length - 1];
  const lastBollingerBand = bollingerBands[bollingerBands.length - 1];
  const lastRSI = rsi[rsi.length - 1];

  const bullishSignal = lastPrice < lastBollingerBand.lower && lastRSI < parameters.rsi_oversold;
  const bearishSignal = lastPrice > lastBollingerBand.upper && lastRSI > parameters.rsi_overbought;

  if (bullishSignal) {
    return { action: "buy", price: lastPrice };
  } else if (bearishSignal) {
    return { action: "sell", price: lastPrice };
  } else {
    return null;
  }
}

module.exports = { strategyConfig, detectSignal };
