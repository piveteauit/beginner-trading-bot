const { initExchange, logInfo, logError, placeOrder, configureMarket } = require('./utils');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');

// Charger les stratégies depuis les fichiers de modules
function loadStrategies() {
  const strategiesDir = path.join(__dirname, 'strategies');
  const strategyFiles = fs.readdirSync(strategiesDir);
  const strategies = [];

  strategyFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const strategy = require(path.join(strategiesDir, file));
      strategies.push(strategy);
    }
  });

  return strategies;
}

async function trade(strategyToTrade = null) {
  const symbols = config.SYMBOLS;
  const strategies = loadStrategies().filter(
    (strategy) =>
      !strategyToTrade || strategy.strategyConfig.name === strategyToTrade
  );

  const exchange = await initExchange(config.API_KEY, config.API_SECRET);

  let globalBalance = await exchange.fetchBalance();
  globalBalance = globalBalance.total.USDT;

  console.log(`Balance globale: ${globalBalance}`);

  async function checkTrade(strategy, symbol) {
    setTimeout(async () => {
      try {
        const market = await exchange.fetchTicker(symbol);
        const prices = await exchange.fetchOHLCV(symbol, "1m", undefined, 14);
        const closes = prices.map((p) => p[4]);
        const signal = strategy.detectSignal(
          closes,
          strategy.strategyConfig.parameters
        );

        if (signal) {
          const lastPrice = market.last;
          const tradeSize =
            (globalBalance * strategy.strategyConfig.parameters.max_trade_pct) /
            lastPrice;

          if (signal.action === "buy") {
            await placeOrder(exchange, symbol, "buy", tradeSize);
            logInfo(`Achat ${symbol} à ${lastPrice}`);
            globalBalance -= tradeSize * lastPrice;
          } else if (signal.action === "sell") {
            await placeOrder(exchange, symbol, "sell", tradeSize);
            logInfo(`Vente ${symbol} à ${lastPrice}`);
            globalBalance += tradeSize * lastPrice;
          }

          // Afficher la balance globale après chaque trade
          console.log(
            `Balance globale après le trade de ${symbol}: ${globalBalance}`
          );
        } else {
          logInfo(`[🕣] ${symbol} - ${strategy.strategyConfig.name}`);
        }
      } catch (error) {
        logError(
          `Erreur lors du trading pour ${symbol} avec la stratégie ${strategy.strategyConfig.name}: ${error.message}`
        );
      } finally {
        await checkTrade(strategy, symbol);
      }
    }, 10_000);
  }

  for (const symbol of symbols) {
    await configureMarket(exchange, symbol);
  }

  for (const strategy of strategies) {
    for (const symbol of symbols) {
      await checkTrade(strategy, symbol);
    }
  }
}

module.exports = { trade };
