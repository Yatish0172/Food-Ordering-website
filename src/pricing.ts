import type { MenuItem } from './types';

const OPTION_PRICE_PATTERN = /\(\+\s*(?:₹|Rs\.?|INR)\s*(\d{1,4})\s*\)$/i;

export function optionSurcharge(option?: string): number {
  if (!option) return 0;
  const match = option.match(OPTION_PRICE_PATTERN);
  if (match) return Number(match[1]);
  if (/\(\+/.test(option)) throw new Error('Invalid priced option configuration: ' + option);
  return 0;
}

export function menuItemUnitPrice(menuItem: MenuItem, selectedOption?: string): number {
  return menuItem.price + optionSurcharge(selectedOption);
}