import React from 'react';
import { Link } from 'react-router-dom';
import Orb from './Orb'; // Import the Orb component

const Home = () => {
  return (
    // The main container needs to be relative to contain the absolutely positioned background.
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-white overflow-hidden">
      
      {/* Background Orb Container */}
      <div className="absolute inset-0 z-0">
        <Orb
          hoverIntensity={0.5}
          rotateOnHover={true}
          hue={220} // A blue/purple hue
          forceHoverState={false}
        />
      </div>

      {/* Foreground Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center p-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Integrations Tool
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mb-8" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
          Explore a comprehensive collection of payment integration demos. Test various payment flows, from standard card payments to alternative payment methods, all in one place.
        </p>
        <div className="flex gap-4">
          <Link
            to="/flow"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            Explore Flow
          </Link>
          <Link
            to="/paypal"
            className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            Explore PayPal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;