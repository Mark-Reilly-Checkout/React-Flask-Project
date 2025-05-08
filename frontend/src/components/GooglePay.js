import React, { useState } from 'react';
import GooglePayButton from '@google-pay/button-react';

const GooglePay = () => {
    const [merchantId, setMerchantId] = useState('BCR2DN4T43P6RORP');
    const [gatewayMerchantId, setGatewayMerchantId] = useState('pk_sbox_z6zxchef4pyoy3bziidwee4clm4');
    const [paymentToken, setPaymentToken] = useState(null);

    const [buttonType, setButtonType] = useState('checkout');
    const [buttonColor, setButtonColor] = useState('black');

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Google Pay Test Suite</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Merchant ID</label>
                        <input
                            type="text"
                            value={merchantId}
                            onChange={(e) => setMerchantId(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Gateway Merchant ID</label>
                        <input
                            type="text"
                            value={gatewayMerchantId}
                            onChange={(e) => setGatewayMerchantId(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    <div className="flex gap-4 mb-4">
                        {/* Button Type Dropdown */}
                        <div className="w-1/2">
                            <label className="block text-sm font-medium mb-1">Button Type</label>
                            <select
                                value={buttonType}
                                onChange={(e) => setButtonType(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                {['book', 'buy', 'checkout', 'donate', 'order', 'plain', 'subscribe'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Button Color Dropdown */}
                        <div className="w-1/2">
                            <label className="block text-sm font-medium mb-1">Button Color</label>
                            <select
                                value={buttonColor}
                                onChange={(e) => setButtonColor(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                {['default', 'black', 'white'].map(color => (
                                    <option key={color} value={color}>{color}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Google Pay Button & Terminal Output */}
                <div className="flex flex-col h-full">
                    <div className="flex justify-center items-center mb-6">
                        <GooglePayButton
                            environment="TEST"
                            paymentRequest={{
                                apiVersion: 2,
                                apiVersionMinor: 0,
                                allowedPaymentMethods: [
                                    {
                                        type: 'CARD',
                                        parameters: {
                                            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                            allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER', 'INTERAC', 'JCB'],
                                        },
                                        tokenizationSpecification: {
                                            type: 'PAYMENT_GATEWAY',
                                            parameters: {
                                                gateway: 'checkoutltd',
                                                gatewayMerchantId: gatewayMerchantId,
                                            },
                                        },
                                    },
                                ],
                                merchantInfo: {
                                    merchantId: merchantId,
                                    merchantName: 'TestBusiness',
                                },
                                transactionInfo: {
                                    totalPriceStatus: 'FINAL',
                                    totalPriceLabel: 'Total',
                                    totalPrice: '1.00',
                                    currencyCode: 'USD',
                                    countryCode: 'US',
                                },
                            }}
                            onLoadPaymentData={paymentRequest => {
                                const token = JSON.parse(paymentRequest.paymentMethodData.tokenizationData.token);
                                setPaymentToken(JSON.stringify(token, null, 2));
                            }}
                            existingPaymentMethodRequired={true}
                            buttonColor={buttonColor}
                            buttonType={buttonType}
                            buttonLocale='en'
                        />
                    </div>

                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64">
                        {paymentToken ? paymentToken : 'Waiting for payment...'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GooglePay;
