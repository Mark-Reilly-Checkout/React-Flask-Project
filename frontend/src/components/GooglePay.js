/* global ApplePaySession */
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
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
      
    {/* Conditional Rendering */}
    {!paymentSuccess ? (
        // Show Apple Pay button container if payment hasn't succeeded
        <div ref={containerRef} className="text-center" />
      ) : (
        // Show success message and payment ID after successful payment
        <div className="text-center mt-4">
          <p className="text-success">✅ Payment successful!</p>
          {paymentId && (
            <p className="text-muted">
              Payment ID: <code>{paymentId}</code>
            </p>
          )}
        </div>
      )}
    </div>
);
};

export default GooglePay;
