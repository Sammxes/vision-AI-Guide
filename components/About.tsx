import React from 'react';

const About: React.FC = () => {
  return (
    <div className="flex flex-col h-full rounded-lg text-gray-800">
      <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">
        About Your Vision AI Guide
      </h2>
      <div className="flex-grow overflow-y-auto space-y-6">
        <div>
          <p className="text-lg leading-relaxed">
            Welcome to <strong>Your Vision AI Guide</strong>, a comprehensive multi-modal assistant designed to empower users through the synergy of advanced voice and vision AI. This application leverages Google's Gemini models to act as a reliable guide for navigating the world, detecting objects, and providing intelligent assistance.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-semibold mt-4 mb-3 text-blue-600 border-b border-gray-300 pb-2">Core Features</h3>
          <ul className="list-disc list-inside space-y-4 pl-2 text-gray-700">
            <li>
              <strong className="font-semibold text-gray-900">Voice Assistant:</strong> Engage in a natural, real-time conversation. The assistant uses Gemini 2.5 Flash Live for responsive audio interactions, capable of web searches, finding nearby places via Google Maps, and assisting with online shopping tasks.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Live Visual Guide:</strong> Transform your camera into a smart eye. The application provides continuous, real-time object and face detection using the powerful Gemini 3 Pro model. It offers detailed scene descriptions, identifies objects with precise bounding boxes, and includes proximity alerts for navigation safety.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">Safety First:</strong> Features a dedicated Emergency Dashboard with quick access to SOS services, location sharing, and proactive emergency detection capabilities.
            </li>
          </ul>
        </div>
        
        <div>
           <h3 className="text-2xl font-semibold mt-4 mb-3 text-blue-600 border-b border-gray-300 pb-2">Technology Stack</h3>
            <p className="mb-3 text-gray-700">
                Built with a modern, high-performance stack for reliability and speed:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-gray-700">
                <li><strong className="font-semibold text-gray-900">Google Gemini API:</strong> Powering both the real-time conversation and the advanced image analysis.</li>
                <li><strong className="font-semibold text-gray-900">React & TypeScript:</strong> Ensuring a robust and responsive user interface.</li>
                <li><strong className="font-semibold text-gray-900">Tailwind CSS:</strong> Providing a clean, accessible, and high-contrast design system.</li>
            </ul>
        </div>

        <div className="text-center pt-6 text-gray-500 text-sm border-t border-gray-200 mt-6">
          <p className="italic">
            Designed to guide, assist, and empower.
          </p>
          <p className="mt-2 font-semibold text-gray-700">
            Created by Sam Polanco
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;