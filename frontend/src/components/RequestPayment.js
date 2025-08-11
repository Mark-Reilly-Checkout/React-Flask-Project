import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Default payload to guide the user.
// NOTE: For testing, replace the source with a valid test token from Frames.js or another source.
// Raw card details should not be used in a real application.
const defaultPaymentPayload = {
  "source": {
    "type": "token",
    "token": "tok_..." // Replace with a valid one-time-use token
  },
  "amount": 1000,
  "currency": "GBP",
  "reference": "risk-json-demo-123",
  "customer": {
    "email": "customer@example.com"
  }
};

const RequestPayment = () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
    const [deviceSessionId, setDeviceSessionId] = useState(null);
    const [paymentResponse, setPaymentResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    // State for the JSON editor
    const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultPaymentPayload, null, 2));
    const [jsonError, setJsonError] = useState(null);

    // Effect to load and initialize the Risk.js SDK
    useEffect(() => {
        const scriptId = 'risk-js';
        if (document.getElementById(scriptId)) {
            // If script is already there, just run the init logic
            if (window.Risk) {
                initializeRisk();
            }
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = "https://risk.sandbox.checkout.com/cdn/risk/2.3/risk.js";
        script.defer = true;
        script.onload = initializeRisk; // Initialize after script loads
        document.body.appendChild(script);

        return () => {
            const riskScript = document.getElementById(scriptId);
            if (riskScript) {
                riskScript.remove();
            }
        };
    }, []);

    const initializeRisk = async () => {
        try {
            const risk = await window.Risk.create("pk_sbox_z6zxchef4pyoy3bziidwee4clm4");
            const dsid = await risk.publishRiskData();
            setDeviceSessionId(dsid);
            toast.info(`Fraud detection session started.`);
            console.log("Device Session ID:", dsid);
        } catch (err) {
            console.error("Risk.js initialization failed:", err);
            toast.error("Failed to initialize fraud detection SDK.");
        }
    };

    const handleJsonInputChange = (e) => {
        const value = e.target.value;
        setJsonInput(value);
        try {
            JSON.parse(value);
            setJsonError(null);
        } catch (error) {
            setJsonError('Invalid JSON format.');
        }
    };

    const handleRequestPayment = async () => {
        if (!deviceSessionId) {
            toast.error("Device session ID is not available. Please wait or refresh.");
            return;
        }
        if (jsonError) {
            toast.error("Cannot proceed. Please fix the invalid JSON.");
            return;
        }

        setLoading(true);
        setPaymentResponse(null);

        try {
            // Parse the user's JSON and create a mutable copy
            const payload = JSON.parse(jsonInput);

            // --- Append the risk object with the device session ID ---
            payload.risk = {
                enabled: true,
                device_session_id: deviceSessionId
            };

            // Send the combined payload to your backend
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
                {/* Left Panel: JSON Request Body */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Direct Card Payment with Risk.js</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Payment Request Body</label>
                            <textarea
                                value={jsonInput}
                                onChange={handleJsonInputChange}
                                className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                                rows={20}
                            />
                            {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600"><strong>Device Session ID (auto-appended):</strong></p>
                        <p className="text-xs text-gray-500 break-all">{deviceSessionId || "Initializing..."}</p>
                    </div>
                    <button
                        onClick={handleRequestPayment}
                        disabled={loading || !deviceSessionId || !!jsonError}
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
