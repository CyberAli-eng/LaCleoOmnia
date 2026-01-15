import { AmazonService } from './amazon/service';
import { ShopifyService } from './shopify/service';
import { WooService } from './woo/service';
import { FlipkartService } from './flipkart/service';
import { ShippingAggregatorService } from './shipping/service';

const amazon = new AmazonService();
const shopify = new ShopifyService();
const woo = new WooService();
const flipkart = new FlipkartService();
const shipping = new ShippingAggregatorService();

export type AdapterKey = 'AMAZON' | 'SHOPIFY' | 'WOO' | 'FLIPKART' | 'SHIPPING';

export const adapters = {
    AMAZON: amazon,
    SHOPIFY: shopify,
    WOO: woo,
    FLIPKART: flipkart,
    SHIPPING: shipping,
};

export function getAdapter(source: string) {
    return adapters[source as AdapterKey];
}
