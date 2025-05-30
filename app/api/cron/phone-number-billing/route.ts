import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updatePhoneNumberStatuses } from '@/lib/phone-number-status';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// This endpoint should be called by a cron job daily
export async function GET(req: NextRequest) {
  try {
    // Verify this is being called by our cron service
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Running phone number billing job');

    // Get all phone numbers that need billing
    const now = new Date();
    const phoneNumbersNeedingBilling = await prisma.twilioPhoneNumber.findMany({
      where: {
        nextBillingDate: {
          lte: now
        },
        status: 'active'
      },
      include: {
        user: {
          include: {
            paymentMethods: {
              where: { isDefault: true }
            }
          }
        }
      }
    });

    console.log(`[Cron] Found ${phoneNumbersNeedingBilling.length} phone numbers needing billing`);

    for (const phoneNumber of phoneNumbersNeedingBilling) {
      try {
        const user = phoneNumber.user;
        const defaultPaymentMethod = user.paymentMethods[0];

        if (!user.stripeCustomerId || !defaultPaymentMethod) {
          // No payment method - update unpaid balance
          await prisma.twilioPhoneNumber.update({
            where: { id: phoneNumber.id },
            data: {
              unpaidBalance: {
                increment: phoneNumber.monthlyPrice
              },
              billingFailedDate: now
            }
          });
          console.log(`[Cron] No payment method for phone number ${phoneNumber.phoneNumber}`);
          continue;
        }

        // Try to charge the payment method
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(phoneNumber.monthlyPrice) * 100),
            currency: 'usd',
            customer: user.stripeCustomerId,
            payment_method: defaultPaymentMethod.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            description: `Monthly charge for phone number ${phoneNumber.phoneNumber}`,
            metadata: {
              userId: user.id,
              phoneNumberId: phoneNumber.id,
              type: 'phone_number_monthly'
            }
          });

          if (paymentIntent.status === 'succeeded') {
            // Payment successful - update billing dates
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await prisma.twilioPhoneNumber.update({
              where: { id: phoneNumber.id },
              data: {
                lastBilledDate: now,
                nextBillingDate,
                unpaidBalance: 0,
                billingFailedDate: null,
                warningsSent: 0
              }
            });

            // Create invoice record
            await prisma.invoice.create({
              data: {
                stripePaymentIntentId: paymentIntent.id,
                amount: phoneNumber.monthlyPrice,
                status: 'paid',
                description: `Monthly charge for phone number ${phoneNumber.phoneNumber}`,
                type: 'recurring',
                userId: user.id,
                twilioPhoneNumberId: phoneNumber.id
              }
            });

            console.log(`[Cron] Successfully billed phone number ${phoneNumber.phoneNumber}`);
          }
        } catch (paymentError: any) {
          // Payment failed - update unpaid balance
          await prisma.twilioPhoneNumber.update({
            where: { id: phoneNumber.id },
            data: {
              unpaidBalance: {
                increment: phoneNumber.monthlyPrice
              },
              billingFailedDate: now
            }
          });
          console.error(`[Cron] Payment failed for phone number ${phoneNumber.phoneNumber}:`, paymentError.message);
        }
      } catch (error) {
        console.error(`[Cron] Error processing phone number ${phoneNumber.id}:`, error);
      }
    }

    // Update all phone number statuses based on payment status
    const allUsers = await prisma.user.findMany({
      select: { id: true }
    });

    for (const user of allUsers) {
      await updatePhoneNumberStatuses(user.id);
    }

    // Release phone numbers that have been pending release for too long
    const phoneNumbersToRelease = await prisma.twilioPhoneNumber.findMany({
      where: {
        status: 'suspended',
        billingFailedDate: {
          lte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
        }
      }
    });

    console.log(`[Cron] Found ${phoneNumbersToRelease.length} phone numbers to release`);

    for (const phoneNumber of phoneNumbersToRelease) {
      try {
        // TODO: Call Twilio API to release the number
        // For now, just mark as released in our database
        await prisma.twilioPhoneNumber.delete({
          where: { id: phoneNumber.id }
        });
        console.log(`[Cron] Released phone number ${phoneNumber.phoneNumber}`);
      } catch (error) {
        console.error(`[Cron] Error releasing phone number ${phoneNumber.id}:`, error);
      }
    }

    console.log('[Cron] Phone number billing job completed');

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      processed: phoneNumbersNeedingBilling.length,
      released: phoneNumbersToRelease.length
    });
  } catch (error) {
    console.error('[Cron] Error in phone number billing job:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 