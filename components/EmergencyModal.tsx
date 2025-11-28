
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  type: 'doctor' | 'family' | 'authority' | 'other';
}

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { latitude: number; longitude: number } | null;
  address?: string; 
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, location }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newType, setNewType] = useState<EmergencyContact['type']>('family');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Load contacts from local storage
  useEffect(() => {
    const saved = localStorage.getItem('emergencyContacts');
    if (saved) {
      setContacts(JSON.parse(saved));
    }
  }, []);

  // Save contacts
  useEffect(() => {
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
  }, [contacts]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow render
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addContact = () => {
    if (!newName || !newNumber) return;
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newName,
      number: newNumber,
      type: newType,
    };
    setContacts([...contacts, newContact]);
    setNewName('');
    setNewNumber('');
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-red-900/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-desc"
    >
      <div 
        className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-lg border-4 border-red-600 overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-red-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-2xl" aria-hidden="true">🚨</span>
            <h2 id="emergency-title" className="text-2xl font-black uppercase tracking-wider">Emergency Dashboard</h2>
          </div>
          <button 
            ref={closeButtonRef}
            onClick={onClose} 
            className="text-white hover:bg-red-700 p-2 rounded-full focus:ring-2 focus:ring-white focus:outline-none"
            aria-label="Close Emergency Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6" id="emergency-desc">
          
          {/* Location Section */}
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-300" role="region" aria-label="Current Location">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-1">Your Current Location</h3>
            <div aria-live="assertive" aria-atomic="true">
              {location ? (
                <div className="text-lg font-mono font-semibold text-gray-800 select-all">
                  Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                </div>
              ) : (
                <div className="text-red-600 font-bold animate-pulse">Locating...</div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Read these coordinates to emergency operators if address is unknown.</p>
          </div>

          {/* Quick Actions - Authorities */}
          <div>
            <h3 className="text-lg font-bold text-red-700 mb-3 border-b border-red-200 pb-1">Authorities</h3>
            <div className="grid grid-cols-2 gap-3">
              <a 
                href="tel:911" 
                className="flex flex-col items-center justify-center bg-red-100 hover:bg-red-200 border-2 border-red-500 text-red-700 p-4 rounded-xl transition-transform active:scale-95 focus:ring-2 focus:ring-red-500 focus:outline-none"
                aria-label="Call 9 1 1 Emergency USA"
              >
                <span className="text-3xl font-black">911</span>
                <span className="text-xs font-bold uppercase mt-1">Emergency (USA)</span>
              </a>
              <a 
                href="tel:112" 
                className="flex flex-col items-center justify-center bg-blue-100 hover:bg-blue-200 border-2 border-blue-500 text-blue-800 p-4 rounded-xl transition-transform active:scale-95 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                aria-label="Call 1 1 2 Emergency Global"
              >
                <span className="text-3xl font-black">112</span>
                <span className="text-xs font-bold uppercase mt-1">Emergency (EU/Global)</span>
              </a>
            </div>
          </div>

          {/* Personal Contacts */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">My Emergency Contacts</h3>
            
            <div className="space-y-3 mb-4" role="list">
              {contacts.length === 0 && <p className="text-gray-400 italic text-sm">No contacts added yet.</p>}
              {contacts.map(contact => (
                <div key={contact.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm" role="listitem">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                      ${contact.type === 'doctor' ? 'bg-green-500' : contact.type === 'family' ? 'bg-purple-500' : 'bg-gray-500'}`} aria-hidden="true">
                      {contact.type === 'doctor' ? 'Dr' : contact.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-600">{contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${contact.number}`} 
                      className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 shadow focus:ring-2 focus:ring-green-500 focus:outline-none"
                      aria-label={`Call ${contact.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </a>
                    <button 
                      onClick={() => removeContact(contact.id)} 
                      className="text-red-400 hover:text-red-600 p-2 focus:ring-2 focus:ring-red-500 rounded-full focus:outline-none"
                      aria-label={`Delete contact ${contact.name}`}
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                       </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Contact Form */}
            <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Add New Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Name (e.g. Mom, Dr. Smith)" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="p-2 rounded border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
                  aria-label="Contact Name"
                />
                 <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  className="p-2 rounded border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
                  aria-label="Phone Number"
                />
                 <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="p-2 rounded border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
                  aria-label="Contact Type"
                >
                  <option value="family">Family</option>
                  <option value="doctor">Doctor</option>
                  <option value="authority">Police/Fire</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Button onClick={addContact} disabled={!newName || !newNumber} variant="secondary" className="w-full h-8 text-sm py-0 bg-gray-700 hover:bg-gray-600 text-white">
                Add Contact
              </Button>
            </div>
          </div>

        </div>
        <div className="bg-gray-100 p-3 text-center text-xs text-gray-500 border-t border-gray-200" aria-live="polite">
          Disclaimer: This app provides quick-dial shortcuts. It cannot bypass network restrictions or replace a physical phone call. Always dial manually if buttons fail.
        </div>
      </div>
    </div>
  );
};
