const { initExchange, getHistoricalPrices, logInfo, logError } = require('./utils');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');

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

async function backtest(strategyToBacktest = null) {
  const exchange = await initExchange(config.API_KEY, config.API_SECRET);
  const symbols = config.SYMBOLS;
  const initialBalance = config.INITIAL_BALANCE;
  const duration = config.BACKTEST.DURATION;
  const candlesLimit = config.BACKTEST.CANDLES_LIMIT;
  const strategies = loadStrategies().filter((strategy) => !strategyToBacktest || strategy.strategyConfig.name === strategyToBacktest);

  let globalBalance = initialBalance;
  let globalPnL = 0;
  let globalTrades = 0;

  for (const symbol of symbols) {
    for (const strategy of strategies) {
      try {
        const historicalPrices = await getHistoricalPrices(exchange, symbol, "1m", exchange.parse8601(duration), candlesLimit);
        const result = await backtestSymbol(symbol, historicalPrices, initialBalance, strategy);
        globalBalance += result.balance - initialBalance;
        globalPnL += result.totalPnL;
        globalTrades += result.tradeLog.length;
        logInfo(`Backtest pour ${symbol} avec la stratégie ${strategy.strategyConfig.name} terminé. Solde initial: ${initialBalance}, Solde final: ${result.balance}, PnL total: ${result.totalPnL}`);
        logInfo(result.tradeLog);
      } catch (error) {
        logError(`Erreur lors du backtest pour ${symbol} avec la stratégie ${strategy.strategyConfig.name}: ${error.message}`);
      }
    }
  }

  console.log("Synthèse globale:");
  console.log(`Solde initial: ${initialBalance}`);
  console.log(`Solde final: ${globalBalance}`);
  console.log(`PnL total: ${globalPnL}`);
  console.log(`Nombre total de trades: ${globalTrades}`);
}

async function backtestSymbol(symbol, historicalPrices, initialBalance, strategy) {
  let balance = initialBalance;
  let positions = {};
  let tradeLog = [];
  let totalPnL = 0;

  for (let i = strategy.strategyConfig.parameters.rsi_period; i < historicalPrices.length; i++) {
    const prices = historicalPrices.slice(0, i).map((p) => p.close);
    const signal = strategy.detectSignal(prices, strategy.strategyConfig.parameters);

    if (signal) {
      const lastPrice = prices[prices.length - 1];
      const tradeSize = (balance * strategy.strategyConfig.parameters.max_trade_pct) / lastPrice;

      if (balance >= tradeSize * lastPrice) {
        if (signal.action === "buy") {
          positions[symbol] = { entryPrice: lastPrice, size: tradeSize, side: "buy" };
          balance -= tradeSize * lastPrice;
          tradeLog.push({ symbol, side: "buy", price: lastPrice, balance, timestamp: historicalPrices[i].timestamp, pnl: 0 });
          logInfo(`Achat ${symbol} à ${lastPrice}, solde restant: ${balance}`);
        } else if (signal.action === "sell") {
          positions[symbol] = { entryPrice: lastPrice, size: tradeSize, side: "sell" };
          balance += tradeSize * lastPrice;
          tradeLog.push({ symbol, side: "sell", price: lastPrice, balance, timestamp: historicalPrices[i].timestamp, pnl: 0 });
          logInfo(`Vente ${symbol} à ${lastPrice}, solde après emprunt: ${balance}`);
        }

        if (positions[symbol] && positions[symbol].side === "buy") {
          const takeProfitPrice = positions[symbol].entryPrice * (1 + strategy.strategyConfig.parameters.take_profit_pct);
          const stopLossPrice = positions[symbol].entryPrice * (1 - strategy.strategyConfig.parameters.stop_loss_pct);

          if (lastPrice >= takeProfitPrice) {
            const pnl = (tradeSize * (lastPrice - positions[symbol].entryPrice)) * strategy.strategyConfig.parameters.leverage;
            balance += tradeSize * lastPrice;
            totalPnL += pnl;
            tradeLog.push({ symbol, side: "sell", price: lastPrice, balance, timestamp: historicalPrices[i].timestamp, pnl });
            delete positions[symbol];
            logInfo(`Vente ${symbol} à ${lastPrice}, PnL: ${pnl}, solde: ${balance}`);
          } else if (lastPrice <= stopLossPrice) {
            const pnl = (tradeSize * (lastPrice - positions[symbol].entryPrice)) * strategy.strategyConfig.parameters.leverage;
            balance += tradeSize * lastPrice;
            totalPnL += pnl;
            tradeLog.push({ symbol, side: "sell", price: lastPrice, balance, timestamp: historicalPrices[i].timestamp, pnl });
            delete positions[symbol];
            logInfo(`Stop loss activé pour ${symbol} à ${lastPrice}, PnL: ${pnl}, solde: ${balance}`);
          }
        } else if (positions[symbol] && positions[symbol].side === "sell") {
          const takeProfitPrice = positions[symbol].entryPrice * (1 - strategy.strategyConfig.parameters.take_profit_pct);
          const stopLossPrice = positions[symbol].entryPrice * (1 + strategy.strategyConfig.parameters.stop_loss_pct);

          if (lastPrice <= takeProfitPrice) {
            const pnl = (tradeSize * (positions[symbol].entryPrice - lastPrice)) * strategy.strategyConfig.parameters.leverage;
            balance -= tradeSize * lastPrice;
            totalPnL += pnl;
            tradeLog.push({ symbol, side: "buy", price: lastPrice, balance, timestamp: historicalPrices[i].timestamp, pnl });
            delete positions[symbol];
            logInfo(`Rachat ${symbol} à ${lastPrice}, PnL: ${pnl}, solde: ${balance}`);
          } else if (lastPrice >= stopLossPrice) {
            const pnl = (tradeSize * (positions[symbol].entryPrice - lastPrice)) * strategy.strategyConfig.parameters.leverage;
            balance -= tradeSize * lastPrice;
            totalPnL += pnl;
            tradeLog.push({ symbol, side: "buy", price: lastPrice, balance, timestamp: historicalPrices[i].timestamp, pnl });
            delete positions[symbol];
            logInfo(`Stop loss activé pour ${symbol} à ${lastPrice}, PnL: ${pnl}, solde: ${balance}`);
          }
        }
      } else {
        logInfo(`Solde insuffisant pour trader ${symbol}. Solde restant: ${balance}`);
      }


    }

    if (balance >= config.TARGET_BALANCE) {
      console.log("Finish", balance)
      process.exit(0)
    }
  }

  return { initialBalance, balance, totalPnL, tradeLog };
}

module.exports = { backtest };
