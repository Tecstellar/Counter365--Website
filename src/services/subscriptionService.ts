import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { SubscriptionRecord, SubscriptionStatusInfo, SubscriptionPlanId } from '../types/models';

export const PRO_PLANS: Array<{
  id: SubscriptionPlanId;
  name: string;
  durationLabel: string;
  originalPrice?: number;
  price: number;
  popular?: boolean;
  bestValue?: boolean;
}> = [
  {
    id: '3_months',
    name: '3 Months Pro',
    durationLabel: '90 Days Access',
    price: 2999,
  },
  {
    id: '6_months',
    name: '6 Months Pro',
    durationLabel: '180 Days Access',
    originalPrice: 5999,
    price: 5499,
    popular: true,
  },
  {
    id: '1_year',
    name: '12 Months Pro',
    durationLabel: '365 Days Access',
    originalPrice: 11999,
    price: 9999,
    bestValue: true,
  },
];

export const subscriptionService = {
  async getShopSubscription(
    shopId: string,
    existingSub?: SubscriptionRecord | null,
    totalBillsCount: number = 0
  ): Promise<{ subscription: SubscriptionRecord | null; statusInfo: SubscriptionStatusInfo }> {
    let sub = existingSub || null;

    if (!sub) {
      try {
        const { data } = await (supabase.from('subscriptions') as any)
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          sub = {
            id: data.id,
            shopId: data.shop_id,
            plan: data.plan,
            status: data.status,
            amount: Number(data.amount) || 0,
            interval: data.interval || 'month',
            trialStartAt: data.trial_start_at,
            trialEndAt: data.trial_end_at,
            subscriptionStartAt: data.subscription_start_at,
            subscriptionEndAt: data.subscription_end_at,
            currentPeriodStart: data.current_period_start,
            currentPeriodEnd: data.current_period_end,
            paymentReference: data.payment_reference,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('Subscription fetch notice:', err);
      }
    }

    const isPaidActive = Boolean(
      sub &&
      sub.status === 'active' &&
      sub.plan !== 'free' &&
      (Number(sub.amount) || 0) > 0 &&
      (!sub.subscriptionEndAt || new Date(sub.subscriptionEndAt).getTime() > Date.now())
    );

    const billsLimit = 100;
    const billsRemaining = Math.max(0, billsLimit - totalBillsCount);
    const billLimitReached = totalBillsCount >= billsLimit && !isPaidActive;

    const progressPercent = Math.min(100, Math.round((totalBillsCount / billsLimit) * 100));

    const statusInfo: SubscriptionStatusInfo = {
      isTrialActive: !isPaidActive && !billLimitReached,
      isTrialExpired: billLimitReached,
      isPaidActive,
      isPaidExpired: !isPaidActive && !!sub?.subscriptionEndAt && new Date(sub.subscriptionEndAt).getTime() <= Date.now(),
      hasAccess: isPaidActive || !billLimitReached,
      requiresSubscription: billLimitReached,
      dayOfTrial: Math.min(100, totalBillsCount),
      daysRemaining: billsRemaining,
      progressPercent,
      trialStartDate: new Date(),
      trialEndDate: new Date(),
      trialEndDateFormatted: `${billsRemaining} bills remaining`,
      activePlanName: isPaidActive ? 'Counter 365 Pro' : 'Free Trial Tier',
      activePlanPrice: isPaidActive ? (sub?.amount || 299) : 0,
      totalBillsCreated: totalBillsCount,
      billsLimit,
      billsRemaining,
      billLimitReached,
    };

    return { subscription: sub, statusInfo };
  },

  getPaymentCheckoutUrl(shopId: string, planId: SubscriptionPlanId, phone?: string): string {
    const baseUrl = 'https://counter365.tecstellar.com/pay';
    const params = new URLSearchParams({
      shopId,
      plan: planId,
    });
    if (phone) params.set('phone', phone);
    return `${baseUrl}?${params.toString()}`;
  },
};
