import React, { useState } from 'react';
import GooglePayButton from '@google-pay/button-react';

const GooglePay = () => {
  const [merchantId, setMerchantId] = useState('BCR2DN4T43P6RORP');
  const [gatewayMerchantId, setGatewayMerchantId] = useState('pk_sbox_z6zxchef4pyoy3bziidwee4clm4');
  const [paymentToken, setPaymentToken] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8">Google Pay Test Suite</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <h2 className="text-xl font-semibold">Configuration</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Merchant ID</label>
            <input
              type="text"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gateway Merchant ID</label>
            <input
              type="text"
              value={gatewayMerchantId}
              onChange={(e) => setGatewayMerchantId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Google Pay and Output */}
        <div className="flex flex-col items-center space-y-6">
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

          {/* Command Line Output */}
          <div className="w-full bg-black text-green-400 font-mono text-sm p-4 rounded-lg overflow-auto h-60">
            {paymentToken ? paymentToken : 'Waiting for payment...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GooglePay;
