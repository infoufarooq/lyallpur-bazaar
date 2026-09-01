export function formatPKR(amount) {
  if (amount === undefined || amount === null) return "Rs. 0";
  return `Rs. ${Number(amount).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
