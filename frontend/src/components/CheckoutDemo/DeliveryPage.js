import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Flow from '../Flow'; // Import the updated Flow component

const DeliveryPage = () => {
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";

    const [basket, setBasket] = useState(null);
    const [billingAddress, setBillingAddress] = useState(null);
    const [customerEmail, setCustomerEmail] = useState(null);
    const [subtotal, setSubtotal] = useState(0);

    const [selectedDeliveryOption, setSelectedDeliveryOption] = useState(null);
    const [totalAmount, setTotalAmount] = useState(null);
    const [paymentSessionForFlow, setPaymentSessionForFlow] = useState(null); // State to pass to Flow component
    const [loadingPaymentSession, setLoadingPaymentSession] = useState(false);

    // Dummy delivery options
    const deliveryOptions = [
        { id: 'standard', name: 'Standard Delivery (3-5 days)', cost: 5.00 },
        { id: 'express', name: 'Express Delivery (1-2 days)', cost: 10.00 },
        { id: 'premium', name: 'Premium Next Day', cost: 15.00 }
    ];

    useEffect(() => {
        // Retrieve data from localStorage on component mount
        const savedBasket = localStorage.getItem('checkoutBasket');
        const savedBillingAddress = localStorage.getItem('checkoutBillingAddress');
        const savedCustomerEmail = localStorage.getItem('checkoutCustomerEmail');
        const savedSubtotal = localStorage.getItem('checkoutSubtotal');

        if (savedBasket && savedBillingAddress && savedCustomerEmail && savedSubtotal) {
            setBasket(JSON.parse(savedBasket));
            setBillingAddress(JSON.parse(savedBillingAddress));
            setCustomerEmail(savedCustomerEmail);
            setSubtotal(parseFloat(savedSubtotal));
        } else {
            // Redirect back to basket if data is missing
            alert("Basket information missing. Please start from the basket page.");
            navigate('/checkout-demo');
        }
    }, [navigate]);

    useEffect(() => {
        // Calculate total amount whenever subtotal or selectedDeliveryOption changes
        if (subtotal !== null && selectedDeliveryOption !== null) {
            setTotalAmount(subtotal + selectedDeliveryOption.cost);
        } else {
            setTotalAmount(null);
        }
    }, [subtotal, selectedDeliveryOption]);


    const handleDeliverySelection = (optionId) => {
        const option = deliveryOptions.find(opt => opt.id === optionId);
        setSelectedDeliveryOption(option);
    };

    const handleConfirmAndPay = async () => {
        if (!selectedDeliveryOption) {
            alert("Please select a delivery option.");
            return;
        }
        if (!totalAmount || !billingAddress || !customerEmail || !basket) {
            alert("Missing essential order details. Please go back to basket.");
            return;
        }

        setLoadingPaymentSession(true);
        try {
            // Make payment session API call
            const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
                amount: Math.round(totalAmount * 100), // Convert to minor units
                currency: basket.currency, // Use currency from basket
                country: billingAddress.country, // Use country from billing address
                email: customerEmail,
                billing_address: billingAddress, // Send the full billing address object
                reference: `order-${Date.now()}` // Dynamic reference
            });

            setPaymentSessionForFlow(response.data); // Store the full session object to pass to Flow
            alert("Payment session created! Flow component will now load.");

        } catch (error) {
            console.error("Error creating payment session:", error.response ? error.response.data : error.message);
            alert("Failed to create payment session. Please try again.");
            setPaymentSessionForFlow(null);
        } finally {
            setLoadingPaymentSession(false);
        }
    };

    if (!basket || !billingAddress || !customerEmail || subtotal === null) {
        return <div className="text-center mt-8 text-gray-700">Loading order details...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Choose Delivery & Pay</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Order Summary & Delivery Options */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Order Summary</Card.Title>
                        <div className="space-y-2 mb-4 border-b pb-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{basket.name} (x{basket.quantity})</span>
                                <span>{basket.currency} {(basket.unitPrice * basket.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Subtotal:</span>
                                <span>{basket.currency} {subtotal.toFixed(2)}</span>
                            </div>
                            {selectedDeliveryOption && (
                                <div className="flex justify-between items-center text-sm text-gray-600">
                                    <span>{selectedDeliveryOption.name}:</span>
                                    <span>{basket.currency} {selectedDeliveryOption.cost.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span>Total:</span>
                            <span>{basket.currency} {totalAmount !== null ? totalAmount.toFixed(2) : '---'}</span>
                        </div>
                    </Card>

                    <Card className="p-6 rounded-xl shadow-md bg-white">
                        <Card.Title className="text-xl font-semibold mb-4">Delivery Options</Card.Title>
                        <div className="space-y-3">
                            {deliveryOptions.map(option => (
                                <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="deliveryOption"
                                        value={option.id}
                                        checked={selectedDeliveryOption?.id === option.id}
                                        onChange={() => handleDeliverySelection(option.id)}
                                        className="form-radio h-5 w-5 text-blue-600"
                                    />
                                    <span className="text-gray-700 font-medium">
                                        {option.name} - {basket.currency} {option.cost.toFixed(2)}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={handleConfirmAndPay}
                            disabled={!selectedDeliveryOption || loadingPaymentSession}
                            className="mt-6 w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 transition duration-300 ease-in-out"
                        >
                            {loadingPaymentSession ? "Generating Payment Session..." : "Confirm Delivery & Pay"}
                        </button>
                    </Card>
                </div>

                {/* Right Panel: Flow Component */}
                <Card className="p-6 rounded-xl shadow-md bg-white flex flex-col items-center justify-center min-h-[500px]">
                    <Card.Title className="text-xl font-semibold mb-4">Payment Details</Card.Title>
                    {paymentSessionForFlow ? (
                        // Render Flow component if payment session is available
                        <Flow passedPaymentSession={paymentSessionForFlow} />
                    ) : (
                        // Placeholder if no payment session yet
                        <div className="text-center text-gray-500">
                            <p>Select delivery and confirm to load payment options.</p>
                            {loadingPaymentSession && <p className="mt-2">Loading...</p>}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default DeliveryPage;