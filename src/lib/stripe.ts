/**
 * Stripe Client Configuration
 * Loads Stripe.js and provides the Stripe instance
 */

import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined");
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};




