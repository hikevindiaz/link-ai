"use client";

import React, { useState } from "react";

interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  logo: string;
  isConnected: boolean;
  setConnectedStatus: (status: any) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  id,
  name,
  description,
  logo,
  isConnected,
  setConnectedStatus,
}) => {
  const [toggle, setToggle] = useState(isConnected);
  const [showModal, setShowModal] = useState(false); // State for configuration modal

  const handleToggle = () => {
    setToggle(!toggle);
    setConnectedStatus((prev: any) => ({ ...prev, [id]: !toggle }));
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <>
      <div className="integration-card">
        {/* Card Header */}
        <div className="integration-header flex items-center justify-between">
          <img src={logo} alt={`${name} Logo`} className="integration-icon h-6 w-6" />
          <h3 className="integration-title text-lg font-semibold flex-1 ml-2">
            {name}
          </h3>
          <label className="switch">
            <input type="checkbox" checked={toggle} onChange={handleToggle} />
            <span className="slider round"></span>
          </label>
        </div>

        {/* Description */}
        <p className="integration-description text-sm text-gray-300 mt-2">
          {description}
        </p>

        {/* Configure Button */}
        <button
          className="configure-btn flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md mt-4"
          onClick={openModal}
        >
          <img src="/bolt.svg" alt="Configure Icon" className="h-4 w-4 mr-2" /> Configure
        </button>
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div className="modal-overlay fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Configure {name}</h2>
            <p className="text-gray-600 mb-4">
              Adjust the settings for the {name} integration here.
            </p>

            {/* Example Form */}
            <div className="form-group mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium">
                API Key
              </label>
              <input
                type="text"
                id="apiKey"
                placeholder="Enter API Key"
                className="mt-1 p-2 w-full border rounded-md"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                className="cancel-btn bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="save-btn bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md"
                onClick={closeModal}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IntegrationCard;
