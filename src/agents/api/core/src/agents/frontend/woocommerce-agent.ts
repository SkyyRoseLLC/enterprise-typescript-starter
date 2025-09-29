/**
 * WooCommerce Elite Frontend Agent
 * Enterprise-grade commerce automation with DI, event-driven design, and ML-ready stubs.
 */

import { EventEmitter } from 'events';

export interface WooConfig {
  readonly baseUrl: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

export interface HttpClient {
  get<T = any>(url: string, opts?: any): Promise<{ data: T }>;
  post<T = any>(url: string, body?: any, opts?: any): Promise<{ data: T }>;
  put<T = any>(url: string, body?: any, opts?: any): Promise<{ data: T }>;
  delete<T = any>(url: string, opts?: any): Promise<{ data: T }>;
}

export interface Logger {
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}

export interface InventoryForecast {
  productId: number;
  daysOfCover: number;
  reorderPoint: number;
  recommendedReorderQty: number;
}

export interface MLPricingModule {
  suggestPrice(product: Product): Promise<number>;
  forecastInventory(productId: number): Promise<InventoryForecast>;
}

export interface Product {
  id?: number;
  name: string;
  type: 'simple' | 'variable';
  sku?: string;
  price: number;
  regular_price?: number;
  sale_price?: number;
  stock_quantity?: number;
  manage_stock?: boolean;
  status?: 'draft' | 'publish';
}

export interface Order {
  id: number;
  status: string;
  total: string;
  currency: string;
  line_items: Array<{ product_id: number; quantity: number; total: string }>;
}

export interface AutoHealing {
  detect(): Promise<string[]>;
  remediate(issue: string): Promise<boolean>;
}

export class WooCommerceAgent extends EventEmitter {
  private readonly cfg: WooConfig;
  private readonly http: HttpClient;
  private readonly logger: Logger;
  private readonly ml: MLPricingModule;
  private readonly heal: AutoHealing;

  constructor(cfg: WooConfig, deps: { http: HttpClient; logger: Logger; ml: MLPricingModule; heal: AutoHealing }) {
    super();
    this.cfg = cfg;
    this.http = deps.http;
    this.logger = deps.logger;
    this.ml = deps.ml;
    this.heal = deps.heal;
  }

  async initialize(): Promise<void> {
    await this.ping();
    this.emit('agent:initialized', { ts: Date.now() });
    this.logger.info('WooCommerce Agent initialized', { baseUrl: this.cfg.baseUrl });
  }

  private authParams() {
    return `consumer_key=${this.cfg.consumerKey}&consumer_secret=${this.cfg.consumerSecret}`;
  }

  private async ping(): Promise<void> {
    try {
      await this.http.get(`${this.cfg.baseUrl}/wp-json/wc/v3/system_status?${this.authParams()}`, { timeout: this.cfg.timeout });
    } catch (e: any) {
      this.logger.error('Woo ping failed', { e });
      throw new Error('WooCommerce connection failed');
    }
  }

  async upsertProduct(input: Product): Promise<Product> {
    // ML pricing suggestion
    const suggested = await this.ml.suggestPrice(input).catch(() => input.price);
    const body = { ...input, regular_price: String(suggested) };

    if (input.id) {
      const res = await this.http.put<Product>(`${this.cfg.baseUrl}/wp-json/wc/v3/products/${input.id}?${this.authParams()}`, body, { timeout: this.cfg.timeout });
      this.emit('product:updated', { id: res.data.id });
      return res.data;
    }

    const res = await this.http.post<Product>(`${this.cfg.baseUrl}/wp-json/wc/v3/products?${this.authParams()}`, body, { timeout: this.cfg.timeout });
    this.emit('product:created', { id: res.data.id });
    return res.data;
  }

  async getOrder(id: number): Promise<Order> {
    const res = await this.http.get<Order>(`${this.cfg.baseUrl}/wp-json/wc/v3/orders/${id}?${this.authParams()}`, { timeout: this.cfg.timeout });
    this.emit('order:fetched', { id });
    return res.data;
  }

  async forecastInventory(productId: number): Promise<InventoryForecast> {
    const forecast = await this.ml.forecastInventory(productId);
    this.emit('inventory:forecast', forecast);
    return forecast;
  }

  async healIfNeeded(): Promise<void> {
    const issues = await this.heal.detect();
    for (const issue of issues) {
      const ok = await this.heal.remediate(issue);
      this.emit('heal:attempt', { issue, ok });
      if (!ok) this.logger.warn('Auto-heal failed', { issue });
    }
  }
}
