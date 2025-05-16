import React, { useEffect, useState } from 'react';
import GooglePayButton from '@google-pay/button-react';

const defaultConfig = {
    merchantId: 'BCR2DN4T43P6RORP',
    gatewayMerchantId: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
    buttonType: 'checkout',
    buttonColor: 'black',
    acquirerCountry: 'GB',
    currencyCode: 'GBP',
    amount: '1.00',
    selectedNetworks: ['MASTERCARD', 'VISA'],
    billingAddressRequired: false,
    billingAddressParameters: null, // or { format: 'MIN' | 'FULL' }
};

const GooglePay = () => {
    const [config, setConfig] = useState(defaultConfig);
    const [paymentToken, setPaymentToken] = useState(null);
    const [viewRaw, setViewRaw] = useState(false);
    const allNetworks = ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER', 'INTERAC', 'JCB'];
    const [billingAddress, setBillingAddress] = useState(null);


    // Load config from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('googlePayConfig');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    // Save config to localStorage on change
    useEffect(() => {
        localStorage.setItem('googlePayConfig', JSON.stringify(config));
    }, [config]);

    const toggleNetwork = (network) => {
        setConfig((prev) => ({
            ...prev,
            selectedNetworks: prev.selectedNetworks.includes(network)
                ? prev.selectedNetworks.filter((n) => n !== network)
                : [...prev.selectedNetworks, network],
        }));
    };

    const handleReset = () => {
        setConfig(defaultConfig);
        localStorage.removeItem('googlePayConfig');
        setPaymentToken(null);
    };

    const handleDownload = () => {
        if (!paymentToken) return;
        const blob = new Blob([paymentToken], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payment-token.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Google Pay Test Suite</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>

                    {/* Merchant ID */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Merchant ID</label>
                        <input
                            type="text"
                            value={config.merchantId}
                            onChange={(e) => setConfig({ ...config, merchantId: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    {/* Gateway Merchant ID */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Gateway Merchant ID</label>
                        <input
                            type="text"
                            value={config.gatewayMerchantId}
                            onChange={(e) => setConfig({ ...config, gatewayMerchantId: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    {/* Button Type & Color */}
                    <div className="flex gap-4 mb-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium mb-1">Button Type</label>
                            <select
                                value={config.buttonType}
                                onChange={(e) => setConfig({ ...config, buttonType: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            >
                                {['Book', 'Buy', 'Checkout', 'Donate', 'Order', 'Plain', 'Subscribe'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-1/2">
                            <label className="block text-sm font-medium mb-1">Button Color</label>
                            <select
                                value={config.buttonColor}
                                onChange={(e) => setConfig({ ...config, buttonColor: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            >
                                {['Default', 'Black', 'White'].map(color => (
                                    <option key={color} value={color}>{color}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Country, Currency, Amount */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Acquirer Country</label>
                            <input
                                type="text"
                                value={config.acquirerCountry}
                                onChange={(e) => setConfig({ ...config, acquirerCountry: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Currency</label>
                            <input
                                type="text"
                                value={config.currencyCode}
                                onChange={(e) => setConfig({ ...config, currencyCode: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <input
                                type="text"
                                value={config.amount}
                                onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Billing Address</label>
  <select
    value={config.billingAddressFormat}
    onChange={(e) =>
      setConfig({
        ...config,
        billingAddressFormat: e.target.value,
        billingAddressRequired: e.target.value !== 'false',
      })
    }
    className="w-full border rounded px-3 py-2"
  >
    <option value="false">False</option>
    <option value="MIN">MIN</option>
    <option value="FULL">FULL</option>
  </select>
                        </div>
                    </div>

                    {/* Card Networks */}
                    <div className="mb-6 text-center">
                        <label className="block text-sm font-medium mb-2">Allowed Card Networks</label>
                        <div className="flex flex-wrap justify-center gap-2">
                            {allNetworks.map(network => (
                                <button
                                    key={network}
                                    onClick={() => toggleNetwork(network)}
                                    className={`px-3 py-1 rounded border text-sm ${config.selectedNetworks.includes(network)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-800 border-gray-300'
                                        }`}
                                >
                                    {network}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        className="mt-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                        Reset to Defaults
                    </button>
                </div>

                {/* Right Panel */}
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
                                            allowedCardNetworks: config.selectedNetworks,
                                            billingAddressRequired: config.billingAddressFormat !== 'false',
    ...(config.billingAddressFormat !== 'false' && {
      billingAddressParameters: {
        format: config.billingAddressFormat
      }
    })
                                        },
                                        tokenizationSpecification: {
                                            type: 'PAYMENT_GATEWAY',
                                            parameters: {
                                                gateway: 'checkoutltd',
                                                gatewayMerchantId: config.gatewayMerchantId,
                                            },
                                        },
                                    },
                                ],
                                merchantInfo: {
                                    merchantId: config.merchantId,
                                    merchantName: 'TestBusiness',
                                },
                                transactionInfo: {
                                    totalPriceStatus: 'FINAL',
                                    totalPriceLabel: 'Total',
                                    totalPrice: config.amount,
                                    currencyCode: config.currencyCode,
                                    countryCode: config.acquirerCountry,
                                },
                            }}
                            onLoadPaymentData={paymentRequest => {
                                const tokenData = JSON.parse(paymentRequest.paymentMethodData.tokenizationData.token);
                              
                                const billing = paymentRequest.paymentMethodData.info?.billingAddress;
                                const combined = {
                                  token: tokenData,
                                  ...(billing ? { billingAddress: billing } : {})
                                };
                              
                                setBillingAddress(billing || null);
                                setPaymentToken(JSON.stringify(combined));
                              }}
                            existingPaymentMethodRequired={true}
                            buttonColor={config.buttonColor}
                            buttonType={config.buttonType}
                            buttonLocale="en"
                        />
                    </div>

                    {/* Token Display + Download */}
                    <div className="flex-1 bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-64 whitespace-pre-wrap break-words">
  {paymentToken
    ? viewRaw
      ? paymentToken
      : JSON.stringify(JSON.parse(paymentToken), null, 2)
    : 'Waiting for payment...'}
</div>

                    {/* Controls */}
                    <div className="flex justify-between items-center mt-4">
                        {paymentToken && (
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                            >
                                Download Token as JSON
                            </button>
                        )}

                        <button
                            className={`px-3 py-1 text-sm rounded ${paymentToken ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            onClick={() => {
                                if (paymentToken) setViewRaw(!viewRaw);
                            }}
                            disabled={!paymentToken}
                        >
                            {viewRaw ? 'Pretty View' : 'Raw View'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GooglePay;
