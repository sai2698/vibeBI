const formatValue = (value, formatType) => {
  let num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return value;
  switch (formatType) {
    case 'compact': return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(num);
    case 'indian': return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(num);
    case 'percentage': return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(num / 100);
    case 'currency': return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    case 'standard':
    default: return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
console.log(formatValue(250.75, 'standard'));
console.log(formatValue(1800, 'compact'));
console.log(formatValue(120000, 'indian'));
console.log(formatValue(0.26, 'percentage'));
console.log(formatValue(26, 'percentage')); // wait, if backend returns 26 for 26%, percent style makes it 2600%
