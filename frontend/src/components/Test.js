import React, { useState } from 'react';
import GooglePayButton from '@google-pay/button-react';

const Test = () => {

    return (
        <div class="bg-white dark:bg-gray-800 flex justify-center items-center w-screen h-screen p-5">
        <div class="border shadow-teal-300 shadow-md max-w-2xl p-6 rounded-lg dark:bg-gray-700 dark:text-gray-300">
          <h1 class="text-4xl font-mono font-extrabold py-3">Tailwind Playground</h1>
          <ul class="list-disc text-lg px-6">
            <div class="px-2">
        <div class="flex -mx-2">
          <div class="w-1/2 px-2">
            <div class="bg-gray-400 h-12"></div>
          </div>
          <div class="w-1/2 px-2">
            <div class="bg-gray-400 h-12"></div>
          </div>
        </div>
      </div>
            <li>Everything here works just like it does when you're running Tailwind CSS locally.</li>
            <li>The preview updates in real-time as you code.</li>
            <li>Save and share your components with the community.</li>
          </ul>
        </div>
      </div>
    );
};

export default Test;
