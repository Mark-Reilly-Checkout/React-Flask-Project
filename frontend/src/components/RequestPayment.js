import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const RequestPayment = () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [deviceSessionId, setDeviceSessionId] = useState(null);
    const [paymentResponse, setPaymentResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // --- NEW: State for Frames.js ---
    const [isCardValid, setIsCardValid] = useState(false);
    const [cardToken, setCardToken] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // --- MODIFIED: This effect now handles both Risk.js and Frames.js ---
    useEffect(() => {
        // --- 1. Load Risk.js SDK ---
        const riskScriptId = 'risk-js';
        if (!document.getElementById(riskScriptId)) {
            const riskScript = document.createElement('script');
            riskScript.id = riskScriptId;
            riskScript.src = "https://risk.sandbox.checkout.com/cdn/risk/2.3/risk.js";
            riskScript.defer = true;
            riskScript.onload = async () => {
                try {
                    const risk = await window.Risk.create("pk_sbox_z6zxchef4pyoy3bziidwee4clm4");
                    const dsid = await risk.publishRiskData();
                    setDeviceSessionId(dsid);
                    toast.info(`Risk device session created.`);
                } catch (err) {
                    console.error("Risk.js initialization failed:", err);
                    toast.error("Failed to initialize fraud detection SDK.");
                }
            };
            document.body.appendChild(riskScript);
        }

        // --- 2. Load Frames.js SDK ---
        const framesScriptId = 'frames-js';
        if (document.getElementById(framesScriptId)) {
            return;
        }
        const framesScript = document.createElement('script');
        framesScript.id = framesScriptId;
        framesScript.src = "https://cdn.checkout.com/js/framesv2.min.js";
        framesScript.defer = true;
        
        framesScript.onload = () => {
            if (window.Frames) {
                window.Frames.init("pk_sbox_z6zxchef4pyoy3bziidwee4clm4");

                // --- Event Handlers for Frames ---
                window.Frames.addEventHandler(
                    window.Frames.Events.CARD_VALIDATION_CHANGED,
                    (event) => {
                        setIsCardValid(window.Frames.isCardValid());
                    }
                );

                window.Frames.addEventHandler(
                    window.Frames.Events.FRAME_VALIDATION_CHANGED,
                    (event) => {
                        const errors = {
                            "card-number": "Please enter a valid card number",
                            "expiry-date": "Please enter a valid expiry date",
                            "cvv": "Please enter a valid cvv code",
                        };
                        if (!event.isValid && !event.isEmpty) {
                            setErrorMessage(errors[event.element]);
                        } else {
                            setErrorMessage('');
                        }
                    }
                );

                window.Frames.addEventHandler(
                    window.Frames.Events.CARD_TOKENIZED,
                    (event) => {
                        console.log("Card tokenized:", event.token);
                        // We set the token and trigger the payment request from here
                        setCardToken(event.token); 
                    }
                );

                window.Frames.addEventHandler(
                    window.Frames.Events.CARD_TOKENIZATION_FAILED,
                    (error) => {
                        console.error("CARD_TOKENIZATION_FAILED: ", error);
                        toast.error("Card tokenization failed.");
                        setLoading(false); // Re-enable button
                    }
                );
            }
        };
        document.body.appendChild(framesScript);

        // Cleanup function
        return () => {
            const riskScript = document.getElementById(riskScriptId);
            if (riskScript) riskScript.remove();
            const framesScriptElem = document.getElementById(framesScriptId);
            if (framesScriptElem) framesScriptElem.remove();
            // It's good practice to clear Frames to remove handlers and instances
            if (window.Frames) window.Frames.removeAllEventHandlers();
        };
    }, []);

    // --- NEW: This effect triggers the payment request AFTER a token is received ---
    useEffect(() => {
        if (cardToken) {
            handleRequestPaymentWithToken(cardToken);
        }
    }, [cardToken]);


    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!deviceSessionId) {
            toast.error("Device session ID is not available. Please wait or refresh.");
            return;
        }
        setLoading(true);
        setPaymentResponse(null);
        window.Frames.submitCard(); // This triggers the CARD_TOKENIZED event on success
    };

    const handleRequestPaymentWithToken = async (token) => {
        try {
            const payload = {
                source: {
                    type: "token",
                    token: token // Use the token from Frames
                },
                amount: 1000,
                currency: "GBP",
                reference: `risk-frames-demo-${Date.now()}`,
                risk: {
                    device_session_id: deviceSessionId
                },
                customer: {
                    email: "customer@example.com"
                }
            };

            const response = await axios.post(`${API_BASE_URL}/api/request-card-payment`, payload);
            setPaymentResponse(response.data);
            toast.success(`Payment processed! Status: ${response.data.status}`);
        } catch (error) {
            console.error("Payment Request Error:", error.response ? error.response.data : error.message);
            toast.error("Payment request failed. See console for details.");
            setPaymentResponse(error.response ? error.response.data : { error: error.message });
        } finally {
            setLoading(false);
            setCardToken(null); // Reset token after use
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Card Form */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Direct Card Payment with Frames.js & Risk.js</h2>
                    
                    {/* --- MODIFIED: This is now a form that uses Frames.js placeholders --- */}
                    <form id="payment-form" onSubmit={handleFormSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Card Number</label>
                                <div className="card-number-frame w-full border rounded px-3 py-2"></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Expiry Date</label>
                                    <div className="expiry-date-frame w-full border rounded px-3 py-2"></div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">CVV</label>
                                    <div className="cvv-frame w-full border rounded px-3 py-2"></div>
                                </div>
                            </div>
                            <div className="text-red-500 text-sm h-4">{errorMessage}</div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-600"><strong>Device Session ID:</strong></p>
                            <p className="text-xs text-gray-500 break-all">{deviceSessionId || "Initializing..."}</p>
                        </div>
                        <button
                            type="submit"
                            id="pay-button"
                            disabled={loading || !isCardValid || !deviceSessionId}
                            className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Pay Now"}
                        </button>
                    </form>
                </div>

                {/* Right Panel: Response */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Payment Response</h2>
                    <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-96 whitespace-pre-wrap break-words">
                        {paymentResponse
                            ? JSON.stringify(paymentResponse, null, 2)
                            : 'Waiting for payment response...'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestPayment;
