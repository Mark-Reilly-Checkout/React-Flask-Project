import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const RequestPayment = () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry_month: '',
        expiry_year: '',
        cvv: '',
        name: ''
    });
    const [deviceSessionId, setDeviceSessionId] = useState(null);
    const [paymentResponse, setPaymentResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    // Effect to load and initialize the Risk.js SDK
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleRequestPayment = async () => {
        if (!deviceSessionId) {
            toast.error("Device session ID is not available. Please wait or refresh.");
            return;
        }

        setLoading(true);
        setPaymentResponse(null);

        try {
            // Construct the payment request payload
            const payload = {
                source: {
                    type: "card",
                    number: cardDetails.number,
                    expiry_month: parseInt(cardDetails.expiry_month),
                    expiry_year: parseInt(cardDetails.expiry_year),
                    cvv: cardDetails.cvv,
                    name: cardDetails.name
                },
                amount: 1000, // Example amount (e.g., 10.00 GBP)
                currency: "GBP",
                reference: `risk-demo-${Date.now()}`,
                risk: {
                    device_session_id: deviceSessionId
                },
                customer: {
                    email: "customer@example.com"
                }
            };

            // Send the request to your backend
            const response = await axios.post(`${API_BASE_URL}/api/request-card-payment`, payload);
            setPaymentResponse(response.data);
            toast.success(`Payment processed! Status: ${response.data.status}`);
        } catch (error) {
            console.error("Payment Request Error:", error.response ? error.response.data : error.message);
            toast.error("Payment request failed. See console for details.");
            setPaymentResponse(error.response ? error.response.data : { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Card Form */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Direct Card Payment with Risk.js</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Card Number</label>
                            <input type="text" name="number" value={cardDetails.number} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Expiry Month</label>
                                <input type="text" name="expiry_month" value={cardDetails.expiry_month} onChange={handleInputChange} className="w-full border rounded px-3 py-2" placeholder="MM" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Expiry Year</label>
                                <input type="text" name="expiry_year" value={cardDetails.expiry_year} onChange={handleInputChange} className="w-full border rounded px-3 py-2" placeholder="YYYY" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">CVV</label>
                            <input type="text" name="cvv" value={cardDetails.cvv} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Cardholder Name</label>
                            <input type="text" name="name" value={cardDetails.name} onChange={handleInputChange} className="w-full border rounded px-3 py-2" />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600"><strong>Device Session ID:</strong></p>
                        <p className="text-xs text-gray-500 break-all">{deviceSessionId || "Initializing..."}</p>
                    </div>
                    <button
                        onClick={handleRequestPayment}
                        disabled={loading || !deviceSessionId}
                        className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Request Payment"}
                    </button>
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
