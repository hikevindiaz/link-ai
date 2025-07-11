'use client';

import React, { Fragment, useState } from 'react';
import {
  RiCheckLine,
  RiUserLine,
  RiMessage3Line,
  RiPhoneLine,
  RiSearchLine,
  RiFileTextLine,
  RiWhatsappLine,
  RiMicLine,
  RiInformationLine,
  RiSubtractLine,
  RiCloseLine,
} from '@remixicon/react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Switch } from '@/components/Switch';
import { Tooltip } from '@/components/Tooltip';
import { toast } from 'sonner';
import { CheckoutConfirmationDialog } from './checkout-confirmation-dialog';

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: {
    name: string;
    priceId: string;
    stripePriceId?: string;
    currentPeriodEnd?: number;
  };
  onPlanConfirmed?: (planId: string) => Promise<void>;
  hasPaymentMethods?: boolean;
  paymentMethods?: Array<{
    id: string;
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
    isDefault: boolean;
    card?: {
      brand?: string;
      last4?: string;
      exp_month?: number;
      exp_year?: number;
    };
  }>;
}

interface Plan {
  id: string;
  name: string;
  price: { monthly: string; annually: string };
  description: string;
  capacity: string[];
  features: string[];
  isStarter: boolean;
  isRecommended: boolean;
  buttonText: string;
}

interface Feature {
  name: string;
  plans: Record<string, boolean | string>;
  tooltip?: string;
}

interface Section {
  name: string;
  features: Feature[];
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: '$69', annually: '$59' },
    description: 'Perfect for individuals and small businesses getting started with AI assistance.',
    capacity: ['1 AI Agent', '2,000 Messages/month'],
    features: [
      '50 SMS Messages',
      '25 Web Searches',
      '10 Document Uploads',
      '5 Conversation Summaries',
      '5 WhatsApp Conversations',
      '30 Voice Minutes',
    ],
    isStarter: false,
    isRecommended: false,
    buttonText: 'Start Free Trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: { monthly: '$199', annually: '$169' },
    description: 'Ideal for growing teams that need more capacity and advanced features.',
    capacity: ['5 AI Agents', '12,000 Messages/month'],
    features: [
      '150 SMS Messages',
      '100 Web Searches',
      '50 Document Uploads',
      '25 Conversation Summaries',
      '25 WhatsApp Conversations',
      '120 Voice Minutes',
    ],
    isStarter: false,
    isRecommended: true,
    buttonText: 'Start Free Trial',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: { monthly: '$499', annually: '$429' },
    description: 'Built for larger organizations requiring maximum capacity and priority support.',
    capacity: ['10 AI Agents', '25,000 Messages/month'],
    features: [
      '400 SMS Messages',
      '250 Web Searches',
      '100 Document Uploads',
      '50 Conversation Summaries',
      '50 WhatsApp Conversations',
      '300 Voice Minutes',
    ],
    isStarter: false,
    isRecommended: false,
    buttonText: 'Start Free Trial',
  },
];

const sections: Section[] = [
  {
    name: 'Core Features',
    features: [
      {
        name: 'AI Agents',
        plans: { Starter: '1', Growth: '5', Scale: '10' },
        tooltip: 'Number of AI assistants you can create and deploy to handle different customer interactions and business tasks.',
      },
      {
        name: 'Messages',
        plans: { Starter: '2,000', Growth: '12,000', Scale: '25,000' },
        tooltip: 'Total conversations (both incoming and outgoing messages) your AI agents can handle per month across all channels.',
      },
      {
        name: 'Phone Numbers',
        plans: { Starter: '1', Growth: '3', Scale: '10' },
        tooltip: 'Dedicated phone numbers for voice calls and SMS. Each number comes with a local area code of your choice.',
      },
      {
        name: 'Knowledge Base Documents',
        plans: { Starter: '10', Growth: '50', Scale: '100' },
        tooltip: 'PDF documents, web pages, and text files you can upload to train your AI agents with your business knowledge.',
      },
    ],
  },
  {
    name: 'Communication Channels',
    features: [
      {
        name: 'SMS Messages',
        plans: { Starter: '50', Growth: '150', Scale: '400' },
        tooltip: 'Text messages your agents can send and receive. Includes both inbound and outbound SMS communications.',
      },
      {
        name: 'WhatsApp Conversations',
        plans: { Starter: '5', Growth: '25', Scale: '50' },
        tooltip: 'WhatsApp business conversations your agents can handle. Each conversation can include multiple message exchanges.',
      },
      {
        name: 'Voice Minutes',
        plans: { Starter: '30', Growth: '120', Scale: '300' },
        tooltip: 'Minutes of voice calls your agents can handle. Includes both inbound calls from customers and outbound calls.',
      },
      {
        name: 'Website Chat Widget',
        plans: { Starter: true, Growth: true, Scale: true },
        tooltip: 'Embeddable chat widget for your website that allows visitors to interact with your AI agents in real-time.',
      },
    ],
  },
  {
    name: 'Intelligence & Analytics',
    features: [
      {
        name: 'Web Searches',
        plans: { Starter: '25', Growth: '100', Scale: '250' },
        tooltip: 'Real-time web searches your agents can perform to provide up-to-date information and answers to customers.',
      },
      {
        name: 'Conversation Summaries',
        plans: { Starter: '5', Growth: '25', Scale: '50' },
        tooltip: 'AI-generated summaries of customer conversations that help you track key insights and follow-up actions.',
      },
      {
        name: 'Analytics Dashboard',
        plans: { Starter: 'Basic', Growth: 'Advanced', Scale: 'Premium' },
        tooltip: 'Comprehensive insights about agent performance, conversation metrics, customer satisfaction, and usage analytics.',
      },
      {
        name: 'Custom Integrations',
        plans: { Starter: false, Growth: 'Limited', Scale: 'Unlimited' },
        tooltip: 'Connect with your existing CRM, helpdesk, e-commerce, and other business tools via APIs and webhooks.',
      },
    ],
  },
  {
    name: 'Support & Branding',
    features: [
      {
        name: 'Support Level',
        plans: { Starter: 'Email', Growth: 'Priority Email', Scale: 'Phone + Email' },
        tooltip: 'Level of customer support provided by our team. Higher tiers get faster response times and dedicated support.',
      },
      {
        name: 'Custom Branding',
        plans: { Starter: 'Link AI Branding', Growth: 'Minimal Branding', Scale: 'No Branding' },
        tooltip: 'Control over branding in your chat widgets and customer interactions. Higher plans allow full white-labeling.',
      },
    ],
  },
];

export function PricingDialog({ open, onOpenChange, currentPlan, onPlanConfirmed, hasPaymentMethods, paymentMethods }: PricingDialogProps) {
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'annually'>('monthly');
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);

  const getCurrentPlanId = () => {
    if (!currentPlan) return null;
    
    // Try multiple ways to detect the current plan
    const priceId = currentPlan.stripePriceId || currentPlan.priceId;
    
    if (priceId) {
      // Map Stripe price IDs to plan IDs
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 'starter';
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) return 'growth';
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID) return 'scale';
    }
    
    // Fallback: try to detect from plan name
    const planName = currentPlan.name?.toLowerCase() || '';
    if (planName.includes('starter')) return 'starter';
    if (planName.includes('growth')) return 'growth';
    if (planName.includes('scale')) return 'scale';
    
    return null;
  };

  const currentPlanId = getCurrentPlanId();

  const handlePlanSelect = (planId: string) => {
    if (planId === currentPlanId) {
      toast.info('You are already on this plan');
      return;
    }
    
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    setSelectedPlanForCheckout(plan);
    setShowCheckoutConfirmation(true);
  };

  const handleConfirmPlan = async (planId: string) => {
    try {
      if (onPlanConfirmed) {
        await onPlanConfirmed(planId);
      }
      
      // Close both dialogs on success
      setShowCheckoutConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error in plan confirmation:', error);
      // Keep dialogs open so user can retry
      throw error;
    }
  };

  const handleBackToPricing = () => {
    setShowCheckoutConfirmation(false);
    setSelectedPlanForCheckout(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-3xl font-bold">Choose Your Plan</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="py-6">
            {/* Header Section */}
            <section className="text-center mb-12">
              <div className="w-fit mx-auto rounded-xl px-3 py-1 bg-neutral-50 text-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-400 mb-4">
                <span className="text-sm font-medium">Transparent Pricing</span>
              </div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">
                Plans that scale with your business
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
                Choose the perfect plan for your needs. All plans include usage-based billing with clear overage pricing.
                No hidden fees, cancel anytime.
              </p>
            </section>

            {/* Billing Toggle */}
            <section className="mb-12">
              <div className="flex items-center justify-center gap-4">
                <Label className="text-base font-medium text-neutral-700 dark:text-neutral-300">
                  Monthly
                </Label>
                <Switch
                  checked={billingFrequency === 'annually'}
                  onCheckedChange={() =>
                    setBillingFrequency(
                      billingFrequency === 'monthly' ? 'annually' : 'monthly',
                    )
                  }
                />
                <Label className="text-base font-medium text-neutral-700 dark:text-neutral-300">
                  Yearly 
                  <span className="ml-1 text-green-600 dark:text-green-400 font-semibold">
                    (Save 15%)
                  </span>
                </Label>
              </div>
            </section>

            {/* Plan Cards */}
            <section className="mb-16">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlanId === plan.id;
                  
                  return (
                    <div key={plan.id} className="relative">
                      {plan.isRecommended && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <span className="bg-neutral-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      <div className={classNames(
                        plan.isRecommended 
                          ? 'border-2 border-neutral-500 shadow-lg' 
                          : 'border border-neutral-200 dark:border-neutral-800',
                        'rounded-xl bg-white dark:bg-neutral-950 p-8 h-full flex flex-col'
                      )}>
                        <div className="text-center mb-8">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={classNames(
                              "text-xl font-bold",
                              plan.isRecommended ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-50"
                            )}>
                              {plan.name}
                            </h3>
                            {/* Show either Current Plan badge or Recommended badge */}
                            {getCurrentPlanId() === plan.id ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                Current Plan
                              </span>
                            ) : plan.isRecommended ? (
                              <span className="bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full text-sm font-medium dark:bg-neutral-900/20 dark:text-neutral-400">
                                Recommended
                              </span>
                            ) : null}
                          </div>
                          <div className="mb-4">
                            <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
                              {plan.price[billingFrequency]}
                            </span>
                            <span className="text-neutral-600 dark:text-neutral-400 ml-1">
                              /month
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {plan.description}
                          </p>
                        </div>

                        <div className="mb-8">
                          <h4 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                            Core Capacity:
                          </h4>
                          <ul className="space-y-3">
                            {plan.capacity.map((item, index) => (
                              <li key={index} className="flex items-center gap-3">
                                {index === 0 && <RiUserLine className="h-4 w-4 text-neutral-500" />}
                                {index === 1 && <RiMessage3Line className="h-4 w-4 text-neutral-500" />}
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mb-8 flex-grow">
                          <h4 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                            Included Features:
                          </h4>
                          <ul className="space-y-3">
                            {plan.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-3">
                                <RiCheckLine className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-auto">
                          {isCurrentPlan ? (
                            <Button 
                              variant="secondary" 
                              className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20" 
                              disabled
                            >
                              ✓ Current Plan
                            </Button>
                          ) : (
                            <Button 
                              className="w-full"
                              variant={plan.isRecommended ? undefined : "secondary"}
                              onClick={() => handlePlanSelect(plan.id)}
                            >
                              {hasPaymentMethods && currentPlan ? 'Switch Plan' : plan.buttonText}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Detailed Comparison Table (Desktop) */}
            <section className="hidden lg:block">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 text-center mb-4">
                  Detailed Feature Comparison
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-center">
                  Compare all features across our plans to find the perfect fit for your needs
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        Features
                      </th>
                      {plans.map((plan) => (
                        <th key={plan.id} className="px-6 py-4 text-center text-sm font-semibold">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <div className={classNames(
                              plan.isRecommended ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-50'
                            )}>
                              {plan.name}
                            </div>
                            {getCurrentPlanId() === plan.id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                Current Plan
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-normal">
                            {plan.price[billingFrequency]}/month
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {sections.map((section, sectionIdx) => (
                      <Fragment key={section.name}>
                        <tr className="bg-neutral-25 dark:bg-neutral-925">
                          <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                            {section.name}
                          </td>
                        </tr>
                        {section.features.map((feature) => (
                          <tr key={feature.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                            <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-50">
                              <div className="flex items-center gap-2">
                                <span>{feature.name}</span>
                                {feature.tooltip && (
                                  <Tooltip content={feature.tooltip}>
                                    <RiInformationLine className="h-4 w-4 text-neutral-400" />
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                            {plans.map((plan) => (
                              <td key={plan.name} className="px-6 py-4 text-center">
                                {typeof feature.plans[plan.name] === 'string' ? (
                                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                    {feature.plans[plan.name]}
                                  </span>
                                ) : feature.plans[plan.name] === true ? (
                                  <RiCheckLine className="h-5 w-5 text-neutral-500 mx-auto" />
                                ) : (
                                  <RiSubtractLine className="h-5 w-5 text-neutral-400 mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Mobile Feature Breakdown */}
            <section className="lg:hidden">
              <div className="space-y-8">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {plan.price[billingFrequency]} per month
                      </p>
                    </div>
                    
                    {sections.map((section) => (
                      <div key={section.name} className="mb-6">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
                          {section.name}
                        </h4>
                        <ul className="space-y-2">
                          {section.features.map((feature) => 
                            feature.plans[plan.name] ? (
                              <li key={feature.name} className="flex items-center gap-3">
                                <RiCheckLine className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                  {feature.name}
                                  {typeof feature.plans[plan.name] === 'string' && (
                                    <span className="text-neutral-500 ml-1">
                                      ({feature.plans[plan.name]})
                                    </span>
                                  )}
                                </span>
                              </li>
                            ) : null
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* Overage Costs Section */}
            <section className="mt-12">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 text-center mb-4">
                  Overage Pricing
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-center">
                  When you exceed your plan limits, you'll only pay for what you use
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4 text-center">
                      {plan.name} Overage Rates
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Messages</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">$0.03</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Web Searches</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">
                          {plan.id === 'starter' ? '$0.10' : plan.id === 'growth' ? '$0.08' : '$0.06'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Summaries</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">
                          {plan.id === 'starter' ? '$0.05' : plan.id === 'growth' ? '$0.04' : '$0.03'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">WhatsApp</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">
                          {plan.id === 'starter' ? '$0.07' : plan.id === 'growth' ? '$0.06' : '$0.05'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Voice</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">
                          {plan.id === 'starter' ? '$0.15' : plan.id === 'growth' ? '$0.12' : '$0.10'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">SMS</span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">
                          {plan.id === 'starter' ? '$0.08' : plan.id === 'growth' ? '$0.08' : '$0.06'}
                        </span>
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <section className="mt-12 text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                All plans include overage billing for usage beyond included limits. 
                Cancel anytime.
              </p>
              <div className="flex justify-center gap-6 text-xs text-neutral-500">
                <span>✓ 14-day free trial</span>
                <span>✓ Cancel anytime</span>
                <span>✓ 24/7 support</span>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      {selectedPlanForCheckout && (
        <CheckoutConfirmationDialog
          open={showCheckoutConfirmation}
          onOpenChange={setShowCheckoutConfirmation}
          selectedPlan={{
            id: selectedPlanForCheckout.id,
            name: selectedPlanForCheckout.name,
            price: selectedPlanForCheckout.price[billingFrequency],
            description: selectedPlanForCheckout.description,
            features: selectedPlanForCheckout.features,
            capacity: selectedPlanForCheckout.capacity,
          }}
          currentPlan={currentPlan}
          paymentMethods={paymentMethods || []}
          onConfirm={handleConfirmPlan}
          onBack={handleBackToPricing}
        />
      )}
    </>
  );
} 