import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import CardGroup from 'react-bootstrap/CardGroup';
import { loadCheckoutWebComponents } from '@checkout.com/checkout-web-components';
import { toast } from 'react-toastify';
import { useSearchParams } from "react-router-dom";

const Flow = () => {
  const [loading, setLoading] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "";
  const [searchParams] = useSearchParams();
  const paymentIdFromUrl = searchParams.get("cko-payment-id");
  const [lastUpdatedSession, setLastUpdatedSession] = useState(null);
  const [lastUpdatedFlow, setLastUpdatedFlow] = useState(null);
  const [lastUpdatedFrames, setLastUpdatedFrames] = useState(null);
  const [timeAgoSession, setTimeAgoSession] = useState('');
  const [timeAgoFlow, setTimeAgoFlow] = useState('');
  const [timeAgoFrames, setTimeAgoFrames] = useState('');
  const [acceptedTermsAndConditions, setAcceptedTermsAndConditions] = useState(false);
  const [inlinePaymentId, setInlinePaymentId] = useState(null);

  // Ref to hold the latest state value for handleClick
  const acceptedTermsRef = useRef(acceptedTermsAndConditions);

  useEffect(() => {
    acceptedTermsRef.current = acceptedTermsAndConditions;
  }, [acceptedTermsAndConditions]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Last updated just now";
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `Last updated ${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `Last updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgoSession(getTimeAgo(lastUpdatedSession));
      setTimeAgoFlow(getTimeAgo(lastUpdatedFlow));
      setTimeAgoFrames(getTimeAgo(lastUpdatedFrames));
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdatedSession, lastUpdatedFlow, lastUpdatedFrames]);

  const SessionRequest = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}api/create-payment-session`, {
        amount: 5000,
        email: "testfry@example.com"
      });
      setPaymentSession(response.data);
      setLastUpdatedSession(new Date());
    } catch (error) {
      console.error("Payment Error:", error.response ? error.response.data : error.message);
      toast.error('Error creating payment session');
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    en: {
      'form.required': 'Please provide this field',
      'form.full_name.placeholder': 'Mark Reilly',
      'pay_button.pay': 'Pay now',
      'pay_button.payment_failed': 'Payment failed, please try again',
    },
  };

  useEffect(() => {
    if (paymentSession) {
      loadCheckoutWebComponents({
        paymentSession,
        publicKey: 'pk_sbox_z6zxchef4pyoy3bziidwee4clm4',
        environment: 'sandbox',
        locale: 'en',
        translations,
        componentOptions: {
          flow: {
            expandFirstPaymentMethod: false,
            handleClick: (_self) => {
              // This only works for card payments and your own pay button
              if (acceptedTermsRef.current) {
                toast.info("Proceeding with payment...");
                return { continue: true };
              } else {
                toast.warn("Please accept the terms and conditions before paying.");
                return { continue: false };
              }
            },
          },
          card: {
            displayCardholderName: 'bottom',
            data: {
              email: 'mark.reilly1234@checkot.com',
            },
          },
        },
        onPaymentCompleted: (_component, paymentResponse) => {
          toast.success('Payment completed successfully!');
          toast.info('Payment ID: ' + paymentResponse.id);
          setInlinePaymentId(paymentResponse.id);
          console.log("Payment ID:", paymentResponse.id);
        },
        onError: (component, error) => {
          toast.error('Payment failed. Please try again.');
          console.error("Payment Error:", error);
          toast.info('Request ID: ' + (error?.request_id || 'N/A'));
        }
      }).then(checkout => {
        const flowComponent = checkout.create('flow');
        flowComponent.mount('#flow-container');
        setLastUpdatedFlow(new Date());
        (async () => {
          const klarnaComponent = checkout.create("klarna");
          const klarnaElement = document.getElementById('klarna-container');
          if (klarnaComponent && await klarnaComponent.isAvailable()) {
            klarnaComponent.mount(klarnaElement);
          }
        })();
      }).catch(err => console.error("Checkout Web Components Error:", err));
    }
  }, [paymentSession]); // Do NOT include acceptedTermsAndConditions here

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const paymentId = urlParams.get('cko-payment-id');
    if (paymentStatus === 'succeeded') {
      toast.success('Payment succeeded!');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
    if (paymentId) {
      console.log('Payment ID from URL:', paymentId);
    }
  }, []);

  return (
    <div>
      <br />
      <div>
        <CardGroup>
          <Card>
            <Card.Body>
              <Card.Title className="text-center">Request a session for Flow</Card.Title>
              <Card.Text>
                <div className="text-center">
                  <button onClick={SessionRequest} disabled={loading}>
                    {loading ? "Processing..." : "Request Session"}
                  </button>
                  <br />
                  <div>
                    {paymentSession && (
                      <p>Payment Session ID: {paymentSession.id}</p>
                    )}
                  </div>
                </div>
              </Card.Text>
            </Card.Body>
            <Card.Footer>
              <small className="text-muted">{timeAgoSession || "Last updated just now"}</small>
            </Card.Footer>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title className="text-center">Flow module</Card.Title>
              <Card.Text>
                {/* Terms and Conditions Checkbox */}
                <div className="mb-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTermsAndConditions}
                    onChange={e => setAcceptedTermsAndConditions(e.target.checked)}
                  />
                  <label htmlFor="terms" style={{ marginLeft: 8 }}>
                    I accept the terms and conditions
                  </label>
                </div>
                {/* Only render flow-container if terms are accepted */}
                {acceptedTermsAndConditions ? (
                  <div id="flow-container"></div>
                ) : (
                  <div className="text-danger mb-2">
                    Please accept the terms and conditions to enable payment.
                  </div>
                )}
                <div id='klarna-container'></div>
                {/* Show Payment ID if available (inline or from URL) */}
                {(inlinePaymentId || paymentIdFromUrl) && (
                  <div className="text-center my-3">
                    <p className="text-success">Payment completed!</p>
                    <p>
                      <strong>Payment ID:</strong> <code>{inlinePaymentId || paymentIdFromUrl}</code>
                    </p>
                  </div>
                )}
              </Card.Text>
            </Card.Body>
            <Card.Footer>
              <small className="text-muted">{timeAgoFlow || "Last updated just now"}</small>
            </Card.Footer>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title className="text-center">Frames</Card.Title>
              <Card.Text>
                <div className="card-frame"></div>
              </Card.Text>
            </Card.Body>
            <Card.Footer>
              <small className="text-muted">{timeAgoFrames || "Last updated just now"}</small>
            </Card.Footer>
          </Card>
        </CardGroup>
      </div>
    </div>
  );
};

export default Flow;
