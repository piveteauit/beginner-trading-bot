module.exports = {
  API_KEY: process?.env?.BYBIT_API_KEY,
  API_SECRET: process?.env?.API_SECRET,
  SYMBOLS: [
    "DOGE/USDT:USDT",
    // "LTC/USDT:USDT",
    "SOL/USDT:USDT",
    "DOT/USDT:USDT",
    // "AVAX/USDT:USDT",
    // "UNI/USDT:USDT",
    // "LINK/USDT:USDT",
    "THETA/USDT:USDT",
    "MATIC/USDT:USDT",
    "BTC/USDT:USDT",
    // "ETH/USDT:USDT",
  ],
  LEVERAGE: {
    "DOGE/USDT:USDT": "50",
    "BTC/USDT:USDT": "100",
  },
  INITIAL_BALANCE: 20, // Capital initial pour le backtest,
  TARGET_BALANCE: 150,
  BACKTEST: {
    DURATION: "2024-05-01T00:00:00Z", // Date de début des données historiques
    CANDLES_LIMIT: 100_000, // Nombre maximum de bougies à récupérer
  },
  defaultLeverage: "10",
};