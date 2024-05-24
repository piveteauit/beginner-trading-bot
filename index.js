require("dotenv").config();
const { backtest } = require("./src/backtest");
const { trade } = require("./src/trade");

const mode = process.argv[2]; // Récupérer le mode à partir des arguments de la ligne de commande

if (mode === "backtest") {
  backtest(process.argv[3])
    .then(() => {
      console.log("Backtest terminé.");
    })
    .catch((error) => {
      console.error("Erreur lors du backtest:", error);
    });
} else if (mode === "trade") {
  trade(process.argv[3])
    .then(() => {
      console.log(
        "Trading en réel :",
        process.argv[3] || "Toutes les stratégies"
      );
    })
    .catch((error) => {
      console.error("Erreur lors du trading en réel:", error);
    });
} else {
  console.log('Mode non reconnu. Utilisez "backtest" ou "trade".');
}
