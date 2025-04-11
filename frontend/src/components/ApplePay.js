import React, { useEffect, useRef } from 'react';

const ApplePay = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = document.createElement('apple-pay-button');
    el.setAttribute('buttonstyle', 'black');
    el.setAttribute('type', 'plain');
    el.setAttribute('locale', 'en-US');
    containerRef.current?.appendChild(el);
}, []);  // The empty dependency array ensures this effect runs only once

  return (
    <div>
      <h1 className="text-center">Apple Pay</h1>
      <div ref={containerRef} className="text-center"></div>
    </div>
  );
};

export default ApplePay;
