const strategyConfig = {
  name: "HF Grid Enhanced",
  description:
    "Utilise une grille de prix très serrée pour acheter et vendre à haute fréquence avec une gestion agressive des positions.",
  parameters: {
    grid_spacing: 0.001, // 0.1% entre chaque niveau de la grille
    grid_levels: 10, // Nombre de niveaux de la grille au-dessus et en-dessous du prix actuel
    stop_loss_pct: 0.002,
    take_profit_pct: 0.003,
    leverage: 50,
    max_trade_pct: 0.3, // 30% du capital par trade
  },
};

function detectSignal(prices, parameters) {
  const lastPrice = prices[prices.length - 1];
  const gridSpacing = parameters.grid_spacing;
  const gridLevels = parameters.grid_levels;
  let signal = null;

  // Détecter les niveaux de la grille
  const grid = [];
  for (let i = 1; i <= gridLevels; i++) {
    const upperLevel = lastPrice * (1 + i * gridSpacing);
    const lowerLevel = lastPrice * (1 - i * gridSpacing);
    grid.push({ level: upperLevel, action: "sell" });
    grid.push({ level: lowerLevel, action: "buy" });
  }

  // Détecter si le prix actuel a atteint un niveau de la grille
  for (const { level, action } of grid) {
    if (
      (action === "sell" && lastPrice >= level) ||
      (action === "buy" && lastPrice <= level)
    ) {
      signal = { action, price: lastPrice };
      break;
    }
  }

  return signal;
}

// Améliorer la gestion des positions ouvertes
function managePosition(position, currentPrice, parameters) {
  const { entryPrice, size, side } = position;
  let action = null;
  let newTradeSize = size * 2; // Augmenter la taille de la position pour l'effet martingale

  const stopLossPrice =
    side === "buy"
      ? entryPrice * (1 - parameters.stop_loss_pct)
      : entryPrice * (1 + parameters.stop_loss_pct);
  const takeProfitPrice =
    side === "buy"
      ? entryPrice * (1 + parameters.take_profit_pct)
      : entryPrice * (1 - parameters.take_profit_pct);

  if (
    (side === "buy" && currentPrice <= stopLossPrice) ||
    (side === "sell" && currentPrice >= stopLossPrice)
  ) {
    action = side === "buy" ? "sell" : "buy";
  } else if (
    (side === "buy" && currentPrice >= takeProfitPrice) ||
    (side === "sell" && currentPrice <= takeProfitPrice)
  ) {
    action = side === "buy" ? "sell" : "buy";
    newTradeSize = size; // Prendre les profits avec la même taille de position
  }

  return { action, tradeSize: newTradeSize };
}

module.exports = { strategyConfig, detectSignal, managePosition };
