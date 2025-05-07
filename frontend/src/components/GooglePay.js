import React, { useEffect, useRef, useState } from 'react';
import GooglePayButton from '@google-pay/button-react';

const GooglePay = () => {

  return (
    <div>
    <h1 className="text-center">Google Pay</h1>

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
                  gatewayMerchantId: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4'
                },
              },
            },
          ],
          merchantInfo: {
            merchantId: 'BCR2DN4T43P6RORP',
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
        }}
        existingPaymentMethodRequired={true}
        buttonColor='black'
        buttonType='checkout'
        buttonLocale='en'
      />
      
    
    </div>
);
};

export default GooglePay;
