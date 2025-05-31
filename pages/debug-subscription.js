import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DebugSubscription() {
  const { data: session } = useSession();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testSubscriptionAPI = async () => {
    if (!session) {
      setError('Not logged in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Testing subscription API...');
      const response = await fetch('/api/billing/subscription');
      const data = await response.json();
      
      console.log('📊 API Response:', data);
      setSubscriptionData(data);
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      testSubscriptionAPI();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Subscription Debug</h1>
        <p>Please log in to test the subscription API</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Subscription Debug</h1>
      
      <div className="mb-4">
        <p><strong>Logged in as:</strong> {session.user?.email}</p>
      </div>

      <button 
        onClick={testSubscriptionAPI}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Subscription API'}
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {subscriptionData && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-bold text-lg mb-2">API Response:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(subscriptionData, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-bold text-lg mb-2">Analysis:</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>Success:</strong> {subscriptionData.success ? '✅ Yes' : '❌ No'}</li>
              <li><strong>Has Subscription:</strong> {subscriptionData.subscription ? '✅ Yes' : '❌ No'}</li>
              <li><strong>Is Subscribed:</strong> {subscriptionData.isSubscribed ? '✅ Yes' : '❌ No'}</li>
              {subscriptionData.subscription && (
                <>
                  <li><strong>Subscription ID:</strong> {subscriptionData.subscription.id}</li>
                  <li><strong>Status:</strong> {subscriptionData.subscription.status}</li>
                  <li><strong>Price ID:</strong> {subscriptionData.subscription.priceId}</li>
                  <li><strong>Stripe Price ID:</strong> {subscriptionData.subscription.stripePriceId}</li>
                  <li><strong>Period End:</strong> {new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString()}</li>
                </>
              )}
            </ul>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-bold text-lg mb-2">Billing Overview Prediction:</h3>
            <p className="text-sm">
              {subscriptionData.subscription 
                ? '✅ Billing overview should show subscription details'
                : '❌ Billing overview will show "No active plan"'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 