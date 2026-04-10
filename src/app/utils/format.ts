export function formatPrice(price: number, transactionType: "Vente" | "Location") {
  if (!Number.isFinite(price) || price <= 0) {
    return "Prix sur demande";
  }

  const formatted = new Intl.NumberFormat("fr-TN", {
    maximumFractionDigits: 0,
  }).format(price);

  return transactionType === "Location" ? `${formatted} TND/mois` : `${formatted} TND`;
}