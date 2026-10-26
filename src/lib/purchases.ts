// Premium (4,99 €/month) and team tips through RevenueCat, i.e. App Store and Google Play billing.
// Store setup: subscription product "iman_premium_monthly" in an offering, entitlement "premium";
// consumables iman_tip_10 / iman_tip_20 / iman_tip_50.
import { Platform } from 'react-native';
import Purchases, { PRODUCT_CATEGORY, type PurchasesPackage, type PurchasesStoreProduct } from 'react-native-purchases';

import { CONFIG } from './config';
import { setState } from './store';

let configured = false;

export function purchasesAvailable(): boolean {
  if (Platform.OS === 'ios') return !!CONFIG.revenueCatIos;
  if (Platform.OS === 'android') return !!CONFIG.revenueCatAndroid;
  return false;
}

export function configurePurchases(userId: string | null) {
  if (!purchasesAvailable()) return;
  const apiKey = Platform.OS === 'ios' ? CONFIG.revenueCatIos : CONFIG.revenueCatAndroid;
  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
    Purchases.addCustomerInfoUpdateListener((info) => {
      setState((s) => ({ ...s, premium: !!info.entitlements.active[CONFIG.premiumEntitlement] }));
    });
    configured = true;
  } else if (userId) {
    Purchases.logIn(userId).catch(() => {});
  }
}

export async function premiumPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.monthly ?? offerings.current?.availablePackages[0] ?? null;
  } catch {
    return null;
  }
}

type Outcome = 'ok' | 'cancelled' | 'unavailable' | 'error';
const cancelled = (e: unknown) => !!(e && typeof e === 'object' && 'userCancelled' in e && (e as { userCancelled?: boolean }).userCancelled);

export async function buyPremium(): Promise<Outcome> {
  const pkg = await premiumPackage();
  if (!pkg) return 'unavailable';
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = !!customerInfo.entitlements.active[CONFIG.premiumEntitlement];
    setState((s) => ({ ...s, premium: active }));
    return active ? 'ok' : 'error';
  } catch (e) {
    return cancelled(e) ? 'cancelled' : 'error';
  }
}

export async function restore(): Promise<Outcome> {
  if (!configured) return 'unavailable';
  try {
    const info = await Purchases.restorePurchases();
    const active = !!info.entitlements.active[CONFIG.premiumEntitlement];
    setState((s) => ({ ...s, premium: active }));
    return active ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function tipProducts(): Promise<PurchasesStoreProduct[]> {
  if (!configured) return [];
  try {
    return await Purchases.getProducts(CONFIG.teamTipProducts.map((p) => p.id), PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  } catch {
    return [];
  }
}

export async function buyTip(product: PurchasesStoreProduct): Promise<Outcome> {
  try {
    await Purchases.purchaseStoreProduct(product);
    return 'ok';
  } catch (e) {
    return cancelled(e) ? 'cancelled' : 'error';
  }
}
