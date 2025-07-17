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

  // --- UPDATED Create Payment Session function ---
  const createPaymentSession = async () => {
    setLoading(true);
    setFlowPaymentSession(null);
    try {
      // Build the full, nested payload that the CKO API expects
      const payload = {
        amount: Math.round(parseFloat(demoConfig.demoAmount) * 100),
        currency: demoConfig.demoCurrency,
        reference: `handle-submit-demo-${Date.now()}`,
        billing: {
          address: demoConfig.demoBillingAddress
        },
        customer: {
          email: demoConfig.demoEmail
        }
      };

      const response = await axios.post(`${API_BASE_URL}/api/create-payment-session`, payload);
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
              console.log("Submit Session Data ", submitData.session_data)
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
          <div className="min-h-screen bg-gray-100 p-6">
              <h1 className="text-3xl font-bold text-center mb-8"> Flow `handleSubmit` Demo</h1>
  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: Information Box + Session Request */}
                  <div className="flex flex-col gap-6">
                      {/* TOP LEFT CARD: Information about handleClick */}
                      <Card>
                          <Card.Body>
                              <Card.Title className="text-center">About `handleSubmit`</Card.Title>
                              <Card.Text>
                                  <p className="text-gray-700">
                                      The <code>handleClick()</code> callback in Checkout.com Flow component is invoked **before** a wallet payment button (like Apple Pay, Google Pay, or PayPal) is clicked.
                                  </p>
                                  <p className="text-gray-700 mt-2">
                                      This allows you to perform **pre-payment checks or validations** (e.g., ensure terms are accepted, validate order value). You return <code>{`{ continue: true }`}</code> to proceed or <code>{`{ continue: false }`}</code> to stop the payment flow.
                                  </p>
                                  <p className="text-gray-700 mt-2">
                                      In this demo, try clicking an APM button with/without checking the "Accept Terms" box below.
                                  </p>
                              </Card.Text>
                          </Card.Body>
                      </Card>
  
                      {/* BOTTOM LEFT CARD: Session Request */}
                      <Card>
                          <Card.Body>
                              <Card.Title className="text-center">Request a new payment session</Card.Title>
                              <Card.Text>
                                  <div className="mb-4">
                                      <label className="block text-sm font-medium mb-1">Amount ($)</label>
                                      <input
                                          type="text"
                                          value={demoConfig.demoAmount}
                                          onChange={handleDemoAmountChange}
                                          className="w-full border rounded px-3 py-2"
                                      />
                                  </div>
                                  <div className="mb-4">
                                      <label className="inline-flex items-center">
                                          <input
                                              type="checkbox"
                                              checked={demoConfig.threeDsEnabled}
                                              onChange={(e) => setDemoConfig({ ...demoConfig, threeDsEnabled: e.target.checked })}
                                              className="form-checkbox h-4 w-4 text-blue-600"
                                          />
                                          <span className="ml-2 text-gray-700">Enable 3D Secure (on payment)</span>
                                      </label>
                                  </div>
                                  <div className="mb-4">
                                      <label className="block text-sm font-medium mb-1">Customer Email</label>
                                      <input
                                          type="email"
                                          value={demoConfig.demoEmail}
                                          onChange={handleDemoEmailChange}
                                          className="w-full border rounded px-3 py-2"
                                      />
                                  </div>
                                  <div className="mb-4">
                                      <label className="block text-sm font-medium mb-1">Country</label>
                                      <select
                                          value={demoConfig.demoCountry}
                                          onChange={handleDemoCountryChange}
                                          className="w-full border rounded px-3 py-2"
                                      >
                                          {countries.map((c) => (
                                              <option key={c.code} value={c.code}>
                                                  {c.name}
                                              </option>
                                          ))}
                                      </select>
                                  </div>
                                  <div className="mb-4">
                                      <label className="block text-sm font-medium mb-1">Currency (Auto-selected)</label>
                                      <input
                                          type="text"
                                          value={demoConfig.demoCurrency}
                                          readOnly
                                          className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                                      />
                                  </div>
                                  <h3 className="text-lg font-semibold mb-3 mt-4">Billing Address</h3>
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-sm font-medium mb-1">Address Line 1</label>
                                          <input
                                              type="text"
                                              name="address_line1"
                                              value={demoConfig.demoBillingAddress?.address_line1 || ''} 
                                              onChange={handleDemoBillingAddressChange}
                                              className="w-full border rounded px-3 py-2"
                                              placeholder="123 Main St"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium mb-1">Address Line 2 (Optional)</label>
                                          <input
                                              type="text"
                                              name="address_line2"
                                              value={demoConfig.demoBillingAddress?.address_line2 || ''} 
                                              onChange={handleDemoBillingAddressChange}
                                              className="w-full border rounded px-3 py-2"
                                              placeholder="Apt 4B"
                                          />
                                      </div>
                                      <div className="flex gap-4">
                                          <div className="flex-1">
                                              <label className="block text-sm font-medium mb-1">City</label>
                                              <input
                                                  type="text"
                                                  name="city"
                                                  value={demoConfig.demoBillingAddress?.city || ''}
                                                  onChange={handleDemoBillingAddressChange}
                                                  className="w-full border rounded px-3 py-2"
                                                  placeholder="London"
                                              />
                                          </div>
                                          <div className="flex-1">
                                              <label className="block text-sm font-medium mb-1">Zip Code</label>
                                              <input
                                                  type="text"
                                                  name="zip"
                                                  value={demoConfig.demoBillingAddress?.zip || ''} 
                                                  onChange={handleDemoBillingAddressChange}
                                                  className="w-full border rounded px-3 py-2"
                                                  placeholder="SW1A 0AA"
                                              />
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-center mt-4">
                                      <button onClick={createPaymentSession} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out disabled:opacity-50">
                                          {loading ? "Processing..." : "Create Session"}
                                      </button>
                                      <br />
                                      {flowPaymentSession && <p className="mt-2 text-sm text-gray-600">Session ID: {flowPaymentSession.id}</p>}
                                  </div>
                              </Card.Text>
                          </Card.Body>
                          <Card.Footer>
                              <small className="text-muted">{timeAgoSession}</small>
                          </Card.Footer>
                      </Card>
                  </div>
  
                  {/* RIGHT COLUMN: Flow Component Display */}
                  <Card>
                      <Card.Body className="flex flex-col h-full p-0">
                          <Card.Title className="text-center p-4">Flow Component Display</Card.Title>
                          {/* Render Flow component only if a session is available */}
                          {flowPaymentSession?.id ? (
                              <>
                                  <div
                                      id="flow-container"
                                      className="mt-4 flex-grow w-full"
                                      style={{ minHeight: '500px', height: 'auto', minWidth: '350px', width: 'auto' }}
                                  ></div>
                              </>
                          ) : (
                              <p className="text-center text-gray-500 mt-4">
                                  Click 'Create Session' to load the payment component.
                              </p>
                          )}
                          <div>
                            <button onClick={handleCustomSubmit} disabled={loading || !flowPaymentSession?.id} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out disabled:opacity-50">
                                Submit Payment
                            </button>
                          </div>
                      </Card.Body>
                      <Card.Footer>
                          <small className="text-muted">{timeAgoFlow}</small>
                      </Card.Footer>
                  </Card>
              </div>
              {paymentIdFromUrl && (
                  <div className="text-center my-3">
                      <p className="text-success">Payment completed!</p>
                      <p>
                          <strong>Payment ID:</strong> <code>{paymentIdFromUrl}</code>
                      </p>
                  </div>
              )}
          </div>
      );
};

export default FlowHandleSubmit;