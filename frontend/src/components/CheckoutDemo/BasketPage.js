import React, { useState } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const BasketPage = () => {
    const navigate = useNavigate();

    // Sample product details
    const product = {
        name: "Wireless Headphones",
        unitPrice: 50.00,
        quantity: 1,
        currency: "GBP"
    };

    const [billingAddress, setBillingAddress] = useState({
        address_line1: '',
        address_line2: '',
        city: '',
        zip: '',
        country: ''
    });

    const [customerEmail, setCustomerEmail] = useState('');

    const subtotal = product.unitPrice * product.quantity;
    const totalAmount = subtotal; // No delivery yet

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setBillingAddress(prev => ({ ...prev, [name]: value }));
    };

    const handleContinue = () => {
        // Simple validation
        if (!billingAddress.address_line1 || !billingAddress.city || !billingAddress.zip || !billingAddress.country || !customerEmail) {
            alert("Please fill in all required billing and email fields.");
            return;
        }

        // Save data to localStorage
        localStorage.setItem('checkoutBasket', JSON.stringify(product));
        localStorage.setItem('checkoutBillingAddress', JSON.stringify(billingAddress));
        localStorage.setItem('checkoutCustomerEmail', customerEmail);
        localStorage.setItem('checkoutSubtotal', totalAmount.toFixed(2)); // Store total item amount

        navigate('/checkout-demo/delivery');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Your Basket</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Basket Summary */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Order Summary</Card.Title>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="font-medium">{product.name} (x{product.quantity})</span>
                            <span>{product.currency} {(product.unitPrice * product.quantity).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold pt-2">
                            <span>Subtotal:</span>
                            <span>{product.currency} {subtotal.toFixed(2)}</span>
                        </div>
                    </div>
                </Card>

                {/* Right Panel: Billing Address & Customer Info */}
                <Card className="p-6 rounded-xl shadow-md bg-white">
                    <Card.Title className="text-xl font-semibold mb-4">Billing & Customer Information</Card.Title>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="customer@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address Line 1</label>
                            <input
                                type="text"
                                name="address_line1"
                                value={billingAddress.address_line1}
                                onChange={handleAddressChange}
                                className="w-full border rounded px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address Line 2 (Optional)</label>
                            <input
                                type="text"
                                name="address_line2"
                                value={billingAddress.address_line2}
                                onChange={handleAddressChange}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={billingAddress.city}
                                    onChange={handleAddressChange}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Zip Code</label>
                                <input
                                    type="text"
                                    name="zip"
                                    value={billingAddress.zip}
                                    onChange={handleAddressChange}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Country</label>
                            <select
                                name="country"
                                value={billingAddress.country}
                                onChange={handleAddressChange}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value="">Select Country</option>
                                <option value="GB">United Kingdom</option>
                                <option value="US">United States</option>
                                <option value="IE">Ireland</option>
                                <option value="DE">Germany</option>
                                {/* Add more countries as needed */}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleContinue}
                        className="mt-6 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out"
                    >
                        Continue to Delivery
                    </button>
                </Card>
            </div>
        </div>
    );
};

export default BasketPage;