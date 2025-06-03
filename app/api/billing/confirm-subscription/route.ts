import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { getUserSubscriptionPlan } from "@/lib/subscription"
import { db } from "@/lib/db"

const confirmSubscriptionSchema = z.object({
  priceId: z.string(),
  planId: z.string(),
})

export async function POST(req: Request) {
    try {
        console.log('[Confirm Subscription] Starting request processing...');
        
        const session = await getServerSession(authOptions)

        if (!session?.user || !session?.user.email) {
            console.log('[Confirm Subscription] Unauthorized - no session or email');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
        }

        const body = await req.json()
        console.log('[Confirm Subscription] Request body:', { priceId: body.priceId, planId: body.planId });
        
        const { priceId, planId } = confirmSubscriptionSchema.parse(body)

        const user = await db.user.findUnique({
            where: {
                id: session.user.id,
            },
        })

        if (!user) {
            console.log('[Confirm Subscription] User not found:', session.user.id);
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
        }

        console.log('[Confirm Subscription] User found:', {
            id: user.id,
            email: user.email,
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: user.stripeSubscriptionId
        });

        const subscriptionPlan = await getUserSubscriptionPlan(session.user.id)
        console.log('[Confirm Subscription] Current subscription plan:', {
            stripeCustomerId: subscriptionPlan.stripeCustomerId,
            stripeSubscriptionId: subscriptionPlan.stripeSubscriptionId,
            stripePriceId: subscriptionPlan.stripePriceId
        });

        // User must have a Stripe customer ID and payment methods
        if (!subscriptionPlan.stripeCustomerId) {
            console.log('[Confirm Subscription] No Stripe customer ID found');
            return new Response(JSON.stringify({ 
                error: 'No payment method found. Please add a payment method first.' 
            }), { status: 400 })
        }

        // Get user's payment methods
        console.log('[Confirm Subscription] Fetching payment methods for customer:', subscriptionPlan.stripeCustomerId);
        const paymentMethods = await stripe.paymentMethods.list({
            customer: subscriptionPlan.stripeCustomerId,
            type: 'card',
        });

        console.log('[Confirm Subscription] Found payment methods:', paymentMethods.data.length);
        if (paymentMethods.data.length === 0) {
            console.log('[Confirm Subscription] No payment methods found');
            return new Response(JSON.stringify({ 
                error: 'No payment method found. Please add a payment method first.' 
            }), { status: 400 })
        }

        // Get the default payment method
        const customer = await stripe.customers.retrieve(subscriptionPlan.stripeCustomerId);
        let defaultPaymentMethodId = null;
        
        if (typeof customer === 'object' && !('deleted' in customer)) {
            defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string;
        }
        
        // Use default payment method or first available
        const paymentMethodToUse = defaultPaymentMethodId || paymentMethods.data[0].id;
        console.log('[Confirm Subscription] Using payment method:', paymentMethodToUse);

        // Handle plan changes vs new subscriptions
        if (subscriptionPlan.stripeSubscriptionId && subscriptionPlan.stripePriceId) {
            // Update existing subscription
            try {
                const currentSubscription = await stripe.subscriptions.retrieve(subscriptionPlan.stripeSubscriptionId);
                
                const subscription = await stripe.subscriptions.update(
                    subscriptionPlan.stripeSubscriptionId,
                    {
                        items: [{
                            id: currentSubscription.items.data[0].id,
                            price: priceId,
                        }],
                        proration_behavior: 'create_prorations',
                    }
                );

                // Immediately update the user's plan in the database
                await db.user.update({
                    where: { id: user.id },
                    data: {
                        stripePriceId: priceId,
                        stripeSubscriptionStatus: subscription.status,
                        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        onboardingCompleted: true,
                    }
                });

                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Plan updated successfully!',
                    subscription: subscription.id 
                }));
            } catch (error: any) {
                console.error('Error updating subscription:', error);
                return new Response(JSON.stringify({ 
                    error: `Failed to update subscription: ${error.message}` 
                }), { status: 500 })
            }
        } else {
            // Create new subscription
            try {
                console.log('[Confirm Subscription] Creating new subscription with:', {
                    customer: subscriptionPlan.stripeCustomerId,
                    priceId: priceId,
                    paymentMethod: paymentMethodToUse
                });
                
                const subscription = await stripe.subscriptions.create({
                    customer: subscriptionPlan.stripeCustomerId,
                    items: [{
                        price: priceId,
                    }],
                    default_payment_method: paymentMethodToUse,
                    trial_period_days: 14, // Always give trial for new subscriptions
                    expand: ['latest_invoice.payment_intent'],
                });

                console.log('[Confirm Subscription] Subscription created:', {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end
                });

                // Check if payment is required immediately (some trials require payment setup)
                const invoice = subscription.latest_invoice as any;
                if (invoice?.payment_intent) {
                    const paymentIntent = invoice.payment_intent;
                    console.log('[Confirm Subscription] Payment intent status:', paymentIntent.status);
                    
                    if (paymentIntent.status === 'requires_payment_method') {
                        console.log('[Confirm Subscription] Payment method validation failed, cancelling subscription');
                        // Cancel the subscription if payment setup failed
                        await stripe.subscriptions.cancel(subscription.id);
                        return new Response(JSON.stringify({ 
                            error: 'Payment method validation failed. Please update your payment method.' 
                        }), { status: 400 })
                    }
                }

                // Immediately update the user's subscription in the database
                console.log('[Confirm Subscription] Updating user database record');
                await db.user.update({
                    where: { id: user.id },
                    data: {
                        stripeSubscriptionId: subscription.id,
                        stripePriceId: priceId,
                        stripeSubscriptionStatus: subscription.status,
                        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        onboardingCompleted: true,
                    }
                });

                console.log('[Confirm Subscription] Database updated successfully');
                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Subscription created successfully! Your 14-day trial has started.',
                    subscription: subscription.id 
                }));
            } catch (error: any) {
                console.error('[Confirm Subscription] Error creating subscription:', error);
                
                // Provide more specific error messages
                if (error.code === 'card_declined') {
                    return new Response(JSON.stringify({ 
                        error: 'Your card was declined. Please try a different payment method.' 
                    }), { status: 400 })
                } else if (error.code === 'insufficient_funds') {
                    return new Response(JSON.stringify({ 
                        error: 'Insufficient funds. Please check your account balance.' 
                    }), { status: 400 })
                } else {
                    return new Response(JSON.stringify({ 
                        error: `Failed to create subscription: ${error.message}` 
                    }), { status: 500 })
                }
            }
        }

    } catch (error) {
        console.error('Error in confirm subscription:', error)
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify({ error: 'Invalid request data', details: error.issues }), { status: 422 })
        }

        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
} 