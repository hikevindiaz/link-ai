import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { getUserSubscriptionPlan } from "@/lib/subscription"
import { absoluteUrl } from "@/lib/utils"
import { stripeCheckoutSchema } from "@/lib/validations/stripeCheckout"
import { db } from "@/lib/db"

const billingUrl = absoluteUrl("dashboard/settings?tab=billing")

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || !session?.user.email) {
            return new Response(null, { status: 403 })
        }

        const body = await req.json()
        const payload = stripeCheckoutSchema.parse(body)

        const user = await db.user.findUnique({
            where: {
                id: session.user.id,
            },
        })

        if (!user) {
            return new Response(null, { status: 403 })
        }

        const subscriptionPlan = await getUserSubscriptionPlan(session.user.id)
        const isChangingPlan = payload.action === 'change_plan'

        // If user has an active subscription and wants to change plans
        if (subscriptionPlan.stripeCustomerId && subscriptionPlan.stripeSubscriptionId && isChangingPlan) {
            try {
                // Update subscription immediately using saved payment method
                const subscription = await stripe.subscriptions.update(
                    subscriptionPlan.stripeSubscriptionId,
                    {
                        items: [{
                            id: (await stripe.subscriptions.retrieve(subscriptionPlan.stripeSubscriptionId)).items.data[0].id,
                            price: payload.priceId,
                        }],
                        proration_behavior: 'create_prorations',
                    }
                );

                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Plan updated successfully',
                    subscription: subscription.id 
                }));
            } catch (error: any) {
                console.error('Error updating subscription:', error);
                
                // If direct update fails, fall back to billing portal
                const stripeSession = await stripe.billingPortal.sessions.create({
                    customer: subscriptionPlan.stripeCustomerId,
                    return_url: billingUrl,
                });

                return new Response(JSON.stringify({ url: stripeSession.url }));
            }
        }

        // Check if user has saved payment methods
        if (subscriptionPlan.stripeCustomerId) {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: subscriptionPlan.stripeCustomerId,
                type: 'card',
            });

            // If user has saved payment methods, create subscription directly
            if (paymentMethods.data.length > 0) {
                try {
                    const subscription = await stripe.subscriptions.create({
                        customer: subscriptionPlan.stripeCustomerId,
                        items: [{
                            price: payload.priceId,
                        }],
                        default_payment_method: paymentMethods.data[0].id,
                        trial_period_days: user.stripeSubscriptionStatus === 'canceled' ? undefined : 7,
                        expand: ['latest_invoice.payment_intent'],
                    });

                    // Check if payment succeeded
                    const invoice = subscription.latest_invoice as any;
                    if (invoice.payment_intent.status === 'succeeded') {
                        return new Response(JSON.stringify({ 
                            success: true, 
                            message: 'Subscription created successfully',
                            subscription: subscription.id 
                        }));
                    } else {
                        // Payment failed, handle gracefully
                        await stripe.subscriptions.cancel(subscription.id);
                        throw new Error('Payment failed');
                    }
                } catch (error: any) {
                    console.error('Error creating subscription with saved payment method:', error);
                    
                    // If direct charge fails, redirect to checkout to update payment method
                    const stripeSession = await stripe.checkout.sessions.create({
                        success_url: billingUrl,
                        cancel_url: billingUrl,
                        payment_method_types: ["card"],
                        mode: "subscription",
                        billing_address_collection: "auto",
                        customer: subscriptionPlan.stripeCustomerId,
                        line_items: [{
                            price: payload.priceId,
                            quantity: 1,
                        }],
                        metadata: {
                            userId: session.user.id,
                        },
                    });
                    
                    return new Response(JSON.stringify({ 
                        url: stripeSession.url,
                        message: 'Payment method needs to be updated' 
                    }));
                }
            }

            // User exists but no payment methods - redirect to checkout
            const stripeSession = await stripe.checkout.sessions.create({
                success_url: billingUrl,
                cancel_url: billingUrl,
                payment_method_types: ["card"],
                mode: "subscription",
                billing_address_collection: "auto",
                customer: subscriptionPlan.stripeCustomerId,
                line_items: [{
                    price: payload.priceId,
                    quantity: 1,
                }],
                metadata: {
                    userId: session.user.id,
                },
            });
            return new Response(JSON.stringify({ url: stripeSession.url }));
        }

        // New user - create checkout session with trial
        const stripeSession = await stripe.checkout.sessions.create({
            success_url: billingUrl,
            cancel_url: billingUrl,
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            customer_email: session.user.email,
            line_items: [{
                price: payload.priceId,
                quantity: 1,
            }],
            subscription_data: {
                trial_period_days: 7
            },
            metadata: {
                userId: session.user.id,
            },
        });
        return new Response(JSON.stringify({ url: stripeSession.url }));

    } catch (error) {
        console.log(error)
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.issues), { status: 422 })
        }

        return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 })
    }
}