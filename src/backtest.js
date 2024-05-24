const {
  initExchange,
  getHistoricalPrices,
  logInfo,
  logError,
} = require("./utils");
const fs = require("fs");
const path = require("path");
const config = require("./config/config");

// Charger les stratégies depuis les fichiers de modules
function loadStrategies() {
  const strategiesDir = path.join(__dirname, "strategies");
  const strategyFiles = fs.readdirSync(strategiesDir);
  return strategyFiles
    .filter((file) => file.endsWith(".js"))
    .map((file) => require(path.join(strategiesDir, file)));
}

// Exécuter le backtest pour un symbole donné et une stratégie
async function backtestSymbol(symbol, historicalPrices, strategy, globalState) {
  let { balance, totalPnL, tradeLog, positions } = globalState;

  for (let i = 1; i < historicalPrices.length; i++) {
    const prices = historicalPrices.slice(0, i).map((p) => p.close);
    const signal = strategy.detectSignal(
      prices,
      strategy.strategyConfig.parameters
    );

    // Gérer les positions ouvertes
    if (positions[symbol]) {
      const position = positions[symbol];
      const managementSignal = strategy.managePosition
        ? strategy.managePosition(
            position,
            prices[prices.length - 1],
            strategy.strategyConfig.parameters
          )
        : null;
      if (managementSignal) {
        const { action, tradeSize } = managementSignal;
        if (action) {
          const lastPrice = prices[prices.length - 1];
          balance +=
            action === "buy" ? -tradeSize * lastPrice : tradeSize * lastPrice;
          const pnl =
            (action === "buy"
              ? lastPrice - position.entryPrice
              : position.entryPrice - lastPrice) *
            tradeSize *
            strategy.strategyConfig.parameters.leverage;
          totalPnL += pnl;
          tradeLog.push({
            symbol,
            side: action,
            price: lastPrice,
            balance,
            timestamp: historicalPrices[i].timestamp,
            pnl,
          });
          delete positions[symbol];
          logInfo(
            `${action} ${symbol} à ${lastPrice}, PnL: ${pnl}, solde: ${balance}`
          );
        }
      }
    }

    // Détecter les signaux de la stratégie
    if (signal) {
      const { action, price: lastPrice } = signal;
      const tradeSize =
        (balance * strategy.strategyConfig.parameters.max_trade_pct) /
        lastPrice;

      if (balance >= tradeSize * lastPrice) {
        const entryAction = action === "buy" ? "buy" : "sell";
        positions[symbol] = {
          entryPrice: lastPrice,
          size: tradeSize,
          side: entryAction,
        };
        balance +=
          action === "buy" ? -tradeSize * lastPrice : tradeSize * lastPrice;
        tradeLog.push({
          symbol,
          side: entryAction,
          price: lastPrice,
          balance,
          timestamp: historicalPrices[i].timestamp,
          pnl: 0,
        });
        logInfo(
          `${
            entryAction.charAt(0).toUpperCase() + entryAction.slice(1)
          } ${symbol} à ${lastPrice}, solde restant: ${balance}`
        );
      } else {
        logInfo(
          `Solde insuffisant pour trader ${symbol}. Solde restant: ${balance}`
        );
      }
    }

    if (balance >= config.TARGET_BALANCE) {
      logInfo.log("Finish", balance, "in : ", tradeLog?.length, "trades");
      process.exit(0);
    }
  }

  globalState.balance = balance;
  globalState.totalPnL = totalPnL;
  globalState.tradeLog = tradeLog;
  globalState.positions = positions;

  return { balance, totalPnL, tradeLog };
}

async function backtest(strategyToBacktest = null) {
  const exchange = await initExchange(config.API_KEY, config.API_SECRET);
  // const symbols = config.SYMBOLS;
  const mKeys = Object.keys(exchange.markets);
  const symbols = mKeys?.filter((m) => {
    return (
      exchange.markets[m]?.info.contractType === "LinearPerpetual" &&
      exchange.markets[m]?.info?.quoteCoin === "USDT"
    );
  });

  const duration = config.BACKTEST.DURATION;
  const candlesLimit = config.BACKTEST.CANDLES_LIMIT;
  const strategies = loadStrategies().filter(
    (strategy) =>
      !strategyToBacktest || strategy.strategyConfig.name === strategyToBacktest
  );

  let globalState = {
    balance: config.INITIAL_BALANCE,
    totalPnL: 0,
    tradeLog: [],
    positions: {},
  };

  const balanceBefore = globalState.balance;

  const tasks = [];

  for (const symbol of symbols) {
    for (const strategy of strategies) {
      tasks.push(
        (async () => {
          try {
            const historicalPrices = await getHistoricalPrices(
              exchange,
              symbol,
              "1m",
              exchange.parse8601(duration),
              candlesLimit
            );
            const result = await backtestSymbol(
              symbol,
              historicalPrices,
              strategy,
              globalState
            );
            logInfo(
              `Backtest pour ${symbol} avec la stratégie ${strategy.strategyConfig.name} terminé. Solde initial: ${balanceBefore}, Solde final: ${result.balance}, PnL total: ${result.totalPnL}`
            );
            logInfo(result.totalPnL, result.balance);
          } catch (error) {
            logError(
              `Erreur lors du backtest pour ${symbol} avec la stratégie ${strategy.strategyConfig.name}: ${error.message}`
            );
          }
        })()
      );
    }
  }

  await Promise.all(tasks);

  console.log("Synthèse globale:");
  console.log(`Solde initial: ${balanceBefore}`);
  console.log(`Solde final: ${globalState.balance}`);
  console.log(`PnL total: ${globalState.totalPnL}`);
  console.log(`Nombre total de trades: ${globalState.tradeLog.length}`);
}

module.exports = { backtest };
