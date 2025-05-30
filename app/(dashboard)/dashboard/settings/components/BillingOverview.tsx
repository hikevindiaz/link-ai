'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/Button';

interface BillingOverviewProps {
  currentPlan: any;
  usageData: Array<{
    resource: string;
    usage: string;
    maximum: string;
    percentage: number;
    overage: number;
    overageCost: number;
  }>;
  phoneNumbers: Array<{
    id: string;
    phoneNumber: string;
    monthlyPrice: number;
    status: string;
  }>;
  overageCost: number;
  onShowPricingDialog: () => void;
}

export function BillingOverview({ 
  currentPlan, 
  usageData, 
  phoneNumbers, 
  overageCost, 
  onShowPricingDialog 
}: BillingOverviewProps) {
  const getPlanDetails = () => {
    if (!currentPlan) return {
      name: 'No active plan',
      price: '$0',
      features: [] as string[]
    };
    
    const planInfo = {
      starter: { name: 'Starter Plan', price: '$69 per month' },
      growth: { name: 'Growth Plan', price: '$199 per month' },
      scale: { name: 'Scale Plan', price: '$499 per month' }
    };
    
    const priceId = currentPlan.priceId || currentPlan.stripePriceId || '';
    let selectedPlan = planInfo.starter;
    
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
      selectedPlan = planInfo.starter;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) {
      selectedPlan = planInfo.growth;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID) {
      selectedPlan = planInfo.scale;
    }
    
    return selectedPlan;
  };

  const planDetails = getPlanDetails();

  if (!currentPlan) {
    return (
      <Card className="mt-8 p-8 text-center">
        <div className="flex justify-center mb-4">
          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
          No active plan
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Choose a plan to get started with AI agents and unlock powerful automation features.
        </p>
        <Button onClick={onShowPricingDialog}>
          Choose a plan
        </Button>
      </Card>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 p-0">
      <div className="flex items-start space-x-10 px-6 py-2">
        <ul className="w-full divide-y divide-gray-200 text-sm text-gray-500 dark:divide-gray-800 dark:text-gray-500">
          {/* Plan */}
          <li className="flex items-center justify-between py-4">
            <div className="w-full">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-gray-50">
                  {planDetails.name}
                </p>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {planDetails.price}
                </p>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                <button
                  onClick={onShowPricingDialog}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:dark:text-indigo-300 hover:underline"
                >
                  Switch Plan
                </button>
              </p>
            </div>
          </li>
          
          {/* Usage Items */}
          {usageData.map((usage, index) => (
            <li key={index} className="flex items-center justify-between py-4">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    {usage.resource}
                  </p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {usage.overageCost > 0 
                      ? `$${usage.overageCost.toFixed(2)}`
                      : '$0.00'
                    }
                  </p>
                </div>
                <div className="w-full md:w-1/2">
                  {usage.percentage >= 0 && (
                    <div className="mt-2 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          usage.percentage > 100 ? 'bg-red-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                  <p className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                    <span>Used {usage.usage}</span>
                    <span>{usage.maximum}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
          
          {/* Phone Numbers */}
          {phoneNumbers.map((phone) => (
            <li key={phone.id} className="flex items-center justify-between py-4">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-50">
                      Phone Number ({phone.phoneNumber})
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      phone.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : phone.status === 'pending'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
                        : phone.status === 'warning'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {phone.status.charAt(0).toUpperCase() + phone.status.slice(1)}
                    </span>
                  </div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    ${phone.monthlyPrice.toFixed(2)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Dedicated phone line, ${phone.monthlyPrice.toFixed(2)}/mo
                </p>
              </div>
            </li>
          ))}
          
          {/* Additional Charges */}
          {overageCost > 0 && (
            <li className="flex items-center justify-between py-4">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    Additional usage charges
                  </p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    ${overageCost.toFixed(2)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Overage beyond plan limits
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>
      
      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
        {currentPlan?.status === 'trialing' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-gray-900 dark:text-gray-50">
              <span>Trial ends {currentPlan.currentPeriodEnd 
                ? new Date(currentPlan.currentPeriodEnd).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric' 
                  })
                : 'soon'
              }</span>
              <span className="font-semibold">
                {currentPlan.currentPeriodEnd 
                  ? `${Math.max(0, Math.ceil((new Date(currentPlan.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days left`
                  : 'Trial active'
                }
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>First billing charge</span>
              <span className="font-medium">
                ${(
                  parseFloat(planDetails.price.replace(/[^0-9.]/g, '')) + 
                  phoneNumbers.reduce((sum, phone) => sum + phone.monthlyPrice, 0) +
                  overageCost
                ).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <p className="flex items-center justify-between text-sm font-medium text-gray-900 dark:text-gray-50">
            <span>Next billing {currentPlan.currentPeriodEnd 
              ? new Date(currentPlan.currentPeriodEnd).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric' 
                })
              : 'date'
            }</span>
            <span className="font-semibold">
              ${(
                parseFloat(planDetails.price.replace(/[^0-9.]/g, '')) + 
                phoneNumbers.reduce((sum, phone) => sum + phone.monthlyPrice, 0) +
                overageCost
              ).toFixed(2)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
} 