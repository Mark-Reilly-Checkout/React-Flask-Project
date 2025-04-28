import React from "react";
import { useSearchParams } from "react-router-dom";

const Failure = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("cko-payment-id");

  return (
    <div className="text-center mt-5">
      <h2> Payment Failed!</h2>
      {paymentId ? (
        <p>
          <strong>Payment ID:</strong> <code>{paymentId}</code>
        </p>
      ) : (
        <p>No payment ID found in URL.</p>
      )}
    </div>
  );
};

export default Failure;
