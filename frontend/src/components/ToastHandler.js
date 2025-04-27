// ToastHandler.js (place this in your root layout/App.js)
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const ToastHandler = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get('status');
    const paymentId = searchParams.get('cko-payment-id');

    if (paymentStatus === 'succeeded') {
      toast.success('Payment succeeded!');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
    }

    if (paymentId) {
      console.log('Payment ID:', paymentId);
    }
  }, [searchParams]);

  return null; // This component doesn't render anything
};

export default ToastHandler;
