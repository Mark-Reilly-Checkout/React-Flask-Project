import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

// Default payload for creating the Hosted Payments Page session
const defaultSessionPayload = {
  amount: 2000,
  currency: "GBP",
  reference: "ORD-HPP-DEMO-123",
  billing: {
    address: {
      country: "GB"
    }
  },
  customer: {
    name: "John Smith",
    email: "john.smith@example.com"
  },
  success_url: "https://example.com/payments/success",
  failure_url: "https://example.com/payments/failure",
  cancel_url: "https://example.com/payments/cancel"
};

const HostedPaymentPages = () => {
    const [loading, setLoading] = useState(false);
    const [sessionResponse, setSessionResponse] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    // State for the JSON editor
    const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultSessionPayload, null, 2));
    const [jsonError, setJsonError] = useState(null);

    // Handler for the JSON text area input
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

    // Function to create the Hosted Payments Page session
    const createHppSession = async () => {
        setLoading(true);
        setSessionResponse(null);

        if (jsonError) {
            toast.error("Cannot create session. Please fix the invalid JSON.");
            setLoading(false);
            return;
        }

        try {
            const payload = JSON.parse(jsonInput);
            const response = await axios.post(`${API_BASE_URL}/api/hosted-payments`, payload);
            setSessionResponse(response.data);
            toast.success("Hosted Payments session created successfully!");
        } catch (error) {
            console.error("HPP Session Error:", error.response ? error.response.data : error.message);
            toast.error('Error creating Hosted Payments session.');
            setSessionResponse({ error: error.response ? error.response.data : error.message });
        } finally {
            setLoading(false);
        }
    };

    // Function to handle the redirect
    const handleRedirect = () => {
        if (sessionResponse?._links?.redirect?.href) {
            window.location.href = sessionResponse._links.redirect.href;
        } else {
            toast.error("No redirect URL found in the response.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Request Body */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Hosted Payment Page Request JSON</Card.Title>
                    <textarea
                        value={jsonInput}
                        onChange={handleJsonInputChange}
                        className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                        rows={20}
                        placeholder="Enter session request JSON here..."
                    />
                    {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                    <button
                        onClick={createHppSession}
                        disabled={loading || !!jsonError}
                        className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                    >
                        {loading ? "Sending request..." : "Create Hosted Payment Page Request"}
                    </button>
                </Card>

                {/* Right Panel: Response and Redirect */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Hosted Payment Page Response</Card.Title>
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-80 whitespace-pre-wrap break-words mb-4">
                        {sessionResponse
                            ? JSON.stringify(sessionResponse, null, 2)
                            : 'Waiting for request response...'}
                    </div>
                    <button
                        onClick={handleRedirect}
                        disabled={!sessionResponse?._links?.redirect?.href}
                        className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50"
                    >
                        Continue to Hosted Payment Page
                    </button>
                </Card>
            </div>
        </div>
    );
};

export default HostedPaymentPages;
