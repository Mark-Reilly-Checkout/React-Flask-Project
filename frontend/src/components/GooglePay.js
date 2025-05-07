import React, { useState } from 'react';
import GooglePayButton from '@google-pay/button-react';

const GooglePay = () => {
    const [merchantId, setMerchantId] = useState('BCR2DN4T43P6RORP');
    const [gatewayMerchantId, setGatewayMerchantId] = useState('pk_sbox_z6zxchef4pyoy3bziidwee4clm4');
    const [paymentToken, setPaymentToken] = useState(null);

    return (
        <header>
        <section class="">
        <div class="grid h-screen grid-cols-2">
            <h1 className="text-3xl font-bold text-center mb-8">Google Pay Test Suite</h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Configuration panel on the left */}
                <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-md">
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
                </div>

                {/* Right Panel: Pay Button + Terminal */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <div className="flex justify-center items-center">
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
                                console.log('Success', paymentRequest);
                                setPaymentToken(JSON.stringify(paymentRequest.paymentMethodData, null, 2));
                            }}
                            existingPaymentMethodRequired={true}
                            buttonColor='black'
                            buttonType='checkout'
                            buttonLocale='en'
                        />
                    </div>

                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64">
                        {paymentToken ? paymentToken : 'Waiting for payment...'}
                    </div>
                </div>
            </div>
        </div>
        </section>
        </header>
    );
};

export default GooglePay;
