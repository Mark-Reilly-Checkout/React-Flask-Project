import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate } from "react-router-dom";

// Country to Currency Mapping
const countries = [
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
];

// Default demo config
const demoDefaultConfig = {
  demoAmount: '50.00',
  demoEmail: 'test@example.com',
  demoCountry: 'ES',
  demoCurrency: 'EUR',
  demoBillingAddress: {
    address_line1: '123 Main St',
    address_line2: '',
    city: 'London',
    zip: 'SW1A 0AA',
    country: 'GB'
  }
};

const FlowHandleSubmit = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [flowPaymentSession, setFlowPaymentSession] = useState(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
  const [searchParams] = useSearchParams();
  const paymentIdFromUrl = searchParams.get("cko-payment-id");

  const [demoConfig, setDemoConfig] = useState(demoDefaultConfig);

  // Ref to hold the FlowComponent instance
  const flowComponentRef = useRef(null);

  // Timestamps for UI
  const [lastUpdatedSession, setLastUpdatedSession] = useState(null);
  const [lastUpdatedFlow, setLastUpdatedFlow] = useState(null);
  const [timeAgoSession, setTimeAgoSession] = useState('');
  const [timeAgoFlow, setTimeAgoFlow] = useState('');

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never updated";
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Last updated just now";
    if (diffMins < 60) {
      return `Last updated ${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `Last updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
  };
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgoSession(getTimeAgo(lastUpdatedSession));
      setTimeAgoFlow(getTimeAgo(lastUpdatedFlow));
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdatedSession, lastUpdatedFlow]);

  // Handlers for demo config inputs
  const handleDemoAmountChange = (e) => setDemoConfig(prev => ({ ...prev, demoAmount: e.target.value }));
  const handleDemoEmailChange = (e) => setDemoConfig(prev => ({ ...prev, demoEmail: e.target.value }));
  const handleDemoCountryChange = (e) => {
    const selectedCountryCode = e.target.value;
    const selectedCountry = countries.find(c => c.code === selectedCountryCode);
    setDemoConfig(prev => ({
      ...prev,
      demoCountry: selectedCountryCode,
      demoCurrency: selectedCountry ? selectedCountry.currency : prev.demoCurrency,
      demoBillingAddress: { ...(prev.demoBillingAddress || {}), country: selectedCountryCode }
    }));
  };
  const handleDemoBillingAddressChange = (e) => {
    const { name, value } = e.target;
    setDemoConfig(prev => ({
      ...prev,
      demoBillingAddress: { ...(prev.demoBillingAddress || {}), [name]: value }
    }));
  };

  // Create Payment Session
  const createPaymentSession = async () => {
    setLoading(true);
    setFlowPaymentSession(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, {
        amount: Math.round(parseFloat(demoConfig.demoAmount) * 100),
        email: demoConfig.demoEmail,
        country: demoConfig.demoCountry,
        currency: demoConfig.demoCurrency,
        billing_address: demoConfig.demoBillingAddress,
      });
      setFlowPaymentSession(response.data);
      setLastUpdatedSession(new Date());
      toast.success("Payment session created successfully! Flow component loading...");
    } catch (error) {
      console.error("Payment Error:", error.response ? error.response.data : error.message);
      toast.error('Error creating payment session: ' + (error.response?.data?.error || error.message));
      setFlowPaymentSession(null);
    } finally {
      setLoading(false);
    }
  };

  // --- Custom Submit Handler for the Button ---
  const handleCustomSubmit = useCallback(() => {
    if (flowComponentRef.current) {
      flowComponentRef.current.submit();
    } else {
      toast.error("Flow component not initialized.");
    }
  }, []);

  // --- Mount FlowComponent with handleSubmit ---
  useEffect(() => {
    if (!flowPaymentSession?.id) {
      // Clear any old component if session disappears
      const flowContainer = document.getElementById('flow-container');
      if (flowContainer) flowContainer.innerHTML = '';
      return;
    }
    const initializeFlowComponent = async (sessionObject) => {
      try {
        const checkout = await loadCheckoutWebComponents({
          paymentSession: sessionObject,
          publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
          environment: 'sandbox',
          locale: 'en',
          componentOptions: {
            flow: {
              expandFirstPaymentMethod: false,
            },
            card: {
              displayCardholderName: 'bottom',
              data: {
                email: demoConfig.demoEmail,
                country: demoConfig.demoCountry,
                currency: demoConfig.demoCurrency,
                billing_address: demoConfig.demoBillingAddress,
              },
            },
          },
          // --- The core handleSubmit implementation ---
          handleSubmit: async (flowComponent, submitData) => {
            try {
              toast.info("Submitting payment...");
              // Compose the payload for your backend
              const payload = {
                session_data: submitData.session_data,
                payment_session_id: flowPaymentSession.id,
                amount: Math.round(parseFloat(demoConfig.demoAmount) * 100),
                threeDsEnabled: true // Or get from your config
              };
              // Call your backend endpoint
              const response = await axios.post(`${API_BASE_URL}/api/submit-flow-session-payment`, payload);
              // Return the UNMODIFIED response from CKO to the FlowComponent
              return response.data;
            } catch (err) {
              // Optionally, show a toast or log error
              toast.error("Payment submission failed.");
              // You must throw an error object for the FlowComponent to handle it
              throw err;
            }
          },
          onPaymentCompleted: (_component, paymentResponse) => {
            toast.success('Payment completed successfully!');
            toast.info('Payment ID: ' + paymentResponse.id);
            navigate(`/success?cko-payment-id=${paymentResponse.id}&status=succeeded`);
          },
          onError: (component, error) => {
            toast.error('Payment failed. Please try again.');
            toast.info('Request ID: ' + (error?.request_id || 'N/A'));
            navigate(`/failure?cko-payment-id=${error?.payment?.id || 'N/A'}&status=failed`);
          }
        });

        const flowComponent = checkout.create('flow');
        flowComponentRef.current = flowComponent; // Store ref for submit button

        if (await flowComponent.isAvailable()) {
          flowComponent.mount('#flow-container');
          setLastUpdatedFlow(new Date());
          toast.info("Flow component ready. Use the custom button to submit payment.");
        } else {
          toast.error("Flow component is not available for mounting.");
        }
      } catch (err) {
        console.error("Checkout Web Components Error:", err);
        toast.error("Error loading Flow component: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    initializeFlowComponent(flowPaymentSession);
  }, [flowPaymentSession, API_BASE_URL, navigate, demoConfig]);

  // For URL parameters (success/failure redirects)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const paymentId = urlParams.get('cko-payment-id');
    if (paymentStatus === 'succeeded') {
      toast.success('Payment succeeded!');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
    if (paymentId) {
      console.log('Payment ID from URL:', paymentId);
    }
  }, []);

  return (
    <div>
      <Card body className="mb-3">
        <h4>Demo: Flow Component with Custom Submit Button (handleSubmit)</h4>
        <div>
          <label>Amount:</label>
          <input type="number" min="0" step="0.01" value={demoConfig.demoAmount} onChange={handleDemoAmountChange} />
          <label>Email:</label>
          <input type="email" value={demoConfig.demoEmail} onChange={handleDemoEmailChange} />
          <label>Country:</label>
          <select value={demoConfig.demoCountry} onChange={handleDemoCountryChange}>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <label>Billing Address:</label>
          <input type="text" name="address_line1" placeholder="Address Line 1" value={demoConfig.demoBillingAddress.address_line1} onChange={handleDemoBillingAddressChange} />
          <input type="text" name="address_line2" placeholder="Address Line 2" value={demoConfig.demoBillingAddress.address_line2} onChange={handleDemoBillingAddressChange} />
          <input type="text" name="city" placeholder="City" value={demoConfig.demoBillingAddress.city} onChange={handleDemoBillingAddressChange} />
          <input type="text" name="zip" placeholder="ZIP" value={demoConfig.demoBillingAddress.zip} onChange={handleDemoBillingAddressChange} />
        </div>
        <button onClick={createPaymentSession} disabled={loading}>
          {loading ? "Creating Session..." : "Create Session"}
        </button>
      </Card>
      <div>
        <div id="flow-container" style={{ minHeight: 250, marginBottom: 16 }} />
        <button onClick={handleCustomSubmit} disabled={loading || !flowPaymentSession?.id}>
          Submit Payment
        </button>
      </div>
      <div>
        <p>Session ID: {flowPaymentSession?.id || '(none)'}</p>
        <p>{timeAgoSession}</p>
        <p>{timeAgoFlow}</p>
      </div>
      {paymentIdFromUrl && (
        <div>
          <h5>Payment completed!</h5>
          <strong>Payment ID:</strong>
          <code>{paymentIdFromUrl}</code>
        </div>
      )}
    </div>
  );
};

export default FlowHandleSubmit;