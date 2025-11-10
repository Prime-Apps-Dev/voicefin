import { ExchangeRates } from '../types';

// Mocking an API call for exchange rates. In a real app, this would fetch from a service.
// Base currency is USD.
const mockRates: ExchangeRates = {
  'USD': 1,
  'EUR': 0.93,
  'JPY': 157.25,
  'GBP': 0.79,
  'AUD': 1.51,
  'CAD': 1.37,
  'CHF': 0.90,
  'CNY': 7.26,
  'INR': 83.54,
  'BRL': 5.25,
  // Added Eurasian and Central Asian currencies
  'RUB': 88.0,
  'TRY': 32.5,
  'KZT': 450.0,
  'UAH': 40.5,
  'UZS': 12650.0,
  'AZN': 1.7,
  'GEL': 2.8,
  'AMD': 387.0,
  'KGS': 87.0,
  'TJS': 10.9,
  'TMT': 3.5,
};

export const getExchangeRates = async (): Promise<ExchangeRates> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return Promise.resolve(mockRates);
};

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number => {
  if (!fromCurrency || !toCurrency || !rates[fromCurrency] || !rates[toCurrency]) {
    return amount; // Return original amount if currency or rates are not available
  }
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const amountInUSD = amount / rates[fromCurrency];
  return amountInUSD * rates[toCurrency];
};