const ccxt = require('ccxt');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');

async function initExchange(apiKey, secret, symbol) {
  const exchange = new ccxt.bybit({
    apiKey,
    secret,
  });

  await exchange.loadMarkets();

  return exchange;
}

async function configureMarket(exchange, symbol) {
  try {
    const market = exchange.markets?.[symbol];
    try {
      const response =
        await exchange.privatePostContractV3PrivatePositionSwitchIsolated({
          symbol: market.id,
          tradeMode: 1,
          buy_leverage: config.LEVERAGE[symbol] || config.defaultLeverage,
          sell_leverage: config.LEVERAGE[symbol] || config.defaultLeverage,
        });
      logInfo("Position mode configured:", response);
    } catch (error) {
      const ok = error.message?.includes("not modified");
      if (ok) {
        logInfo(`Mode de position inchangé pour ${symbol} - OK`);
      } else {
        logError(
          `Erreur lors de la configuration du mode de position pour ${symbol}: ${error.message}`
        );
      }
    }
  } catch (error) {
    logError(
      `Erreur lors de la configuration du mode de position: ${error.message}`
    );
  }
}

function logInfo(message) {
  console.log(`${new Date().toISOString()} - INFO: ${message}`);
}

function logError(message) {
  console.error(`${new Date().toISOString()} - ERROR: ${message}`);
  fs.appendFileSync(path.join(__dirname, '../../logs/errors.log'), `${new Date().toISOString()} - ERROR: ${message}\n`);
}

async function placeOrder(exchange, symbol, side, amount) {
  try {
    if (side === 'buy') {
      return await exchange.createMarketBuyOrder(symbol, amount);
    } else if (side === 'sell') {
      return await exchange.createMarketSellOrder(symbol, amount);
    }
  } catch (error) {
    logError(`Erreur lors du placement de l'ordre: ${error.message}`);
    throw error;
  }
}

async function getHistoricalPrices(exchange, symbol, timeframe, since, limit) {
  const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
  return ohlcv.map(candle => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5]
  }));
}

module.exports = {
  initExchange,
  configureMarket,
  logInfo,
  logError,
  placeOrder,
  getHistoricalPrices,
};
