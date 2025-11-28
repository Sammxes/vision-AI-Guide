import React from 'react';

const Readme: React.FC = () => {
  return (
    <div className="flex flex-col h-full text-gray-800">
      <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">
        User Guide & Instructions
      </h2>
      <div className="flex-grow overflow-y-auto space-y-6 text-lg">
        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Getting Started</h3>
          <p className="leading-relaxed">
            Click the <strong>"Start Assistant"</strong> button or use your screen reader to locate the microphone controls. 
            Grant microphone and camera permissions when prompted. The AI will announce when it is listening.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Voice Commands</h3>
          <p className="mb-2">You can speak naturally to the AI. Try these commands:</p>
          <ul className="list-disc list-inside space-y-2 bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
            <li><strong>"Where am I?"</strong> - Describes your surroundings and location.</li>
            <li><strong>"What is in front of me?"</strong> - Identifies objects in view.</li>
            <li><strong>"Enable camera"</strong> / <strong>"Disable camera"</strong> - Controls the visual feed.</li>
            <li><strong>"Find coffee shops nearby"</strong> - Locates places using Google Maps.</li>
            <li><strong>"Call for help"</strong> or <strong>"SOS"</strong> - Opens the Emergency Dashboard immediately.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Using the Camera (Visuals)</h3>
          <p className="leading-relaxed">
            Toggle the <strong>"Visuals ON"</strong> button to enable the live camera feed. 
            The AI automatically detects objects and faces in real-time.
            <br />
            <span className="text-sm bg-yellow-100 px-2 py-1 rounded mt-2 inline-block border border-yellow-200">
              <strong>Tip:</strong> If you have light perception, a yellow border will pulse on the screen when an object is very close to the camera.
            </span>
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Emergency Features</h3>
          <p className="leading-relaxed">
            The <strong>RED SOS Button</strong> at the top right (or saying "Help") opens the Emergency Dashboard. 
            This provides your current GPS coordinates and quick-dial buttons for 911/112.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Readme;