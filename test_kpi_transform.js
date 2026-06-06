// Test data transformation for KPI
const resData = [
  { "count_INTEGRATION_ID": 13159 }
];

const metrics = [
  { name: "count_INTEGRATION_ID", column: "INTEGRATION_ID", agg: "count", alias: "count_INTEGRATION_ID" }
];

const dimensions = [];

// Simulate the transformation
const getName = (item) => typeof item === 'string' ? item : item.name;
const getDisplayName = (item) => {
  if (typeof item === 'string') return item;
  return item.alias || item.name;
};

const firstMet = metrics[0];
const mDisplay = firstMet ? getDisplayName(firstMet) : 'Value';

console.log("firstMet:", firstMet);
console.log("mDisplay:", mDisplay);
console.log("resData:", resData);
console.log("resData[0]:", resData[0]);
console.log("resData[0][mDisplay]:", resData[0][mDisplay]);

let value = 0;
if (resData.length > 0) {
  const firstRow = resData[0];
  if (firstRow[mDisplay] !== undefined) {
    value = Number(firstRow[mDisplay]) || 0;
    console.log("Value found via mDisplay:", value);
  } else {
    const numericValue = Object.values(firstRow).find(v => typeof v === 'number');
    if (numericValue !== undefined) {
      value = numericValue;
      console.log("Value found via fallback:", value);
    }
  }
}

console.log("Final value:", value);
console.log("Result:", { series: [{ name: mDisplay, value }] });
