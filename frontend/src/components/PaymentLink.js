import axios from "axios";
import Button from 'react-bootstrap/Button';
import React, { useState, useEffect } from 'react';
import { Card, CardText } from 'react-bootstrap';
import { toast } from 'react-toastify';


const defaultPaymentLinkRequest = {
  amount: 2000,
  currency: "GBP",
  reference: "PaymentLink-123",
  billing: {
    address: {
      country: "GB"
    }
  },
  customer: {
    name: "John Smith",
    email: "john.smith@example.com"
  },
  items:{
    name: "Test Item",
    amount: 2000,
    quantity: 1
  },
  success_url: "https://example.com/payments/success",
  failure_url: "https://example.com/payments/failure",
  cancel_url: "https://example.com/payments/cancel"
};

const PaymentLink = () => {
    const [loading, setLoading] = useState(false);
    const [paymentLinkData, setPaymentLinkData] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    // State for the JSON editor
        const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultPaymentLinkRequest, null, 2));
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


const RequestPaymentLink = async () => {
    setLoading(true);
    setPaymentLinkData(null);

    if (jsonError) {
        toast.error("Cannot create payment link. Please fix the invalid JSON.");
        setLoading(false);
        return;
    }

    try {
        const payload = JSON.parse(jsonInput);
        const response = await axios.post(`${API_BASE_URL}/api/paymentLink`, payload);
        setPaymentLinkData(response.data);
        toast.success("Payment Link Created Successfully!");
    } catch (error) {
        console.error("Payment Link Session Error:", error.response ? error.response.data : error.message);
        toast.error('Error Creating Payment Link.');
        setPaymentLinkData({ error: error.response ? error.response.data : error.message });
    } finally {
        setLoading(false);
    }
};

// Function to handle the redirect
    const handleRedirect = () => {
        if (paymentLinkData?._links?.redirect?.href) {
            window.location.href = paymentLinkData._links.redirect.href;
        } else {
            toast.error("No redirect URL found in the response.");
        }
    };
return (
        <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Request Body */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Payment Link Request JSON</Card.Title>
                    <textarea
                        value={jsonInput}
                        onChange={handleJsonInputChange}
                        className={`w-full border rounded px-3 py-2 font-mono text-sm ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                        rows={20}
                        placeholder="Enter session request JSON here..."
                    />
                    {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                    <button
                        onClick={RequestPaymentLink}
                        disabled={loading || !!jsonError}
                        className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                    >
                        {loading ? "Creating Payment Link..." : "Create Payment Link"}
                    </button>
                </Card>

                {/* Right Panel: Response and Redirect */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Payment Link Response</Card.Title>
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-80 whitespace-pre-wrap break-words mb-4">
                        {paymentLinkData
                            ? JSON.stringify(paymentLinkData, null, 2)
                            : 'Waiting for payment link response...'}
                    </div>
                    <button
                        onClick={handleRedirect}
                        disabled={!paymentLinkData?._links?.redirect?.href}
                        className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50"
                    >
                        Continue to Payment Link
                    </button>
                </Card>
            </div>
        </div>
    );
};


export default PaymentLink;

