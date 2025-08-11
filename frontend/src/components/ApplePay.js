import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ApplePay = () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [applePayAvailable, setApplePayAvailable] = useState(false);
    const [paymentResponse, setPaymentResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    // --- NEW: State for Risk.js device session ID ---
    const [deviceSessionId, setDeviceSessionId] = useState(null);

    // --- NEW: Effect to load and initialize the Risk.js SDK ---
    useEffect(() => {
        const scriptId = 'risk-js';
        if (document.getElementById(scriptId)) {
            return; // Script already added
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = "https://risk.sandbox.checkout.com/cdn/risk/2.3/risk.js";
        script.defer = true;
        script.integrity = "sha384-ZGdiIppkJzwran7Bjk0sUZy5z1mZGpR/MJx7LC0xCTyFE2sBpPFeLu4r15yGVei6";
        script.crossOrigin = "anonymous";

        script.addEventListener('load', async () => {
            try {
                console.log("Risk.js SDK loaded.");
                // Initialize Risk.js with your public API key
                const risk = await window.Risk.create("pk_sbox_z6zxchef4pyoy3bziidwee4clm4");
                // Publish device data to get the session ID
                const dsid = await risk.publishRiskData();
                setDeviceSessionId(dsid);
                toast.success(`Risk device session created: ${dsid}`);
                console.log("Device Session ID:", dsid);
            } catch (err) {
                console.error("Risk.js initialization failed:", err);
                toast.error("Failed to initialize fraud detection SDK.");
            }
        });

        document.body.appendChild(script);

        // Cleanup function to remove the script when the component unmounts
        return () => {
            const riskScript = document.getElementById(scriptId);
            if (riskScript) {
                riskScript.remove();
            }
        };
    }, []);


    // Check for Apple Pay availability on component mount
    useEffect(() => {
        if (window.ApplePaySession && window.ApplePaySession.canMakePayments()) {
            setApplePayAvailable(true);
        }
    }, []);

    const handleApplePay = () => {
        if (!applePayAvailable) {
            toast.error("Apple Pay is not available on this device/browser.");
            return;
        }

        // --- NEW: Check for device session ID before starting payment ---
        if (!deviceSessionId) {
            toast.error("Fraud detection session is not ready. Please wait a moment and try again.");
            return;
        }

        const paymentRequest = {
            countryCode: 'GB',
            currencyCode: 'GBP',
            supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
            merchantCapabilities: ['supports3DS'],
            total: { label: 'Your Merchant Name', amount: '10.00' },
        };

        const applePaySession = new window.ApplePaySession(1, paymentRequest);

        applePaySession.onvalidatemerchant = async (event) => {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/apple-pay/validate-merchant`, {
                    validationURL: event.validationURL,
                });
                applePaySession.completeMerchantValidation(response.data);
            } catch (error) {
                console.error("Merchant validation failed:", error);
                applePaySession.abort();
            }
        };

        applePaySession.onpaymentauthorized = async (event) => {
            setLoading(true);
            try {
                // --- MODIFIED: Send deviceSessionId along with the token data ---
                const response = await axios.post(`${API_BASE_URL}/api/apple-pay-session`, {
                    tokenData: event.payment.token,
                    amount: Math.round(parseFloat(paymentRequest.total.amount) * 100),
                    currencyCode: paymentRequest.currencyCode,
                    countryCode: paymentRequest.countryCode,
                    deviceSessionId: deviceSessionId // Include the risk session ID
                });

                setPaymentResponse(response.data);
                if (response.data.approved) {
                    toast.success(`Payment successful! Status: ${response.data.status}`);
                    applePaySession.completePayment(window.ApplePaySession.STATUS_SUCCESS);
                } else {
                    toast.error(`Payment failed. Status: ${response.data.status}`);
                    applePaySession.completePayment(window.ApplePaySession.STATUS_FAILURE);
                }
            } catch (error) {
                console.error("Payment authorization failed:", error);
                setPaymentResponse(error.response ? error.response.data : { error: error.message });
                toast.error("An error occurred during payment processing.");
                applePaySession.completePayment(window.ApplePaySession.STATUS_FAILURE);
            } finally {
                setLoading(false);
            }
        };

        applePaySession.oncancel = () => {
            toast.warn("Payment cancelled by user.");
        };

        applePaySession.begin();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
            <div className="w-full max-w-lg">
                <div className="bg-white p-8 rounded-xl shadow-md text-center">
                    <h1 className="text-2xl font-bold mb-6">Apple Pay with Risk.js</h1>
                    {applePayAvailable ? (
                        <>
                            <p className="text-sm text-gray-600 mb-2"><strong>Device Session ID:</strong></p>
                            <p className="text-xs text-gray-500 break-all mb-6">{deviceSessionId || "Initializing..."}</p>
                            <button
                                onClick={handleApplePay}
                                disabled={loading || !deviceSessionId}
                                className="apple-pay-button apple-pay-button-black" // Using Apple's recommended CSS classes
                            >
                            </button>
                        </>
                    ) : (
                        <p className="text-red-500">Apple Pay is not available on this browser or device.</p>
                    )}
                </div>
                {paymentResponse && (
                    <div className="bg-white p-6 rounded-xl shadow-md mt-6">
                        <h2 className="text-xl font-semibold mb-4">Payment Response</h2>
                        <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(paymentResponse, null, 2)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplePay;
