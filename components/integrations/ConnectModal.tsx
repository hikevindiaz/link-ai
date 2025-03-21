"use client";

import React, { useState } from "react";
import axios from "axios";

interface ConnectModalProps {
  providerId: string;
  providerName: string;
  setShowModal: (show: boolean) => void;
  setConnectedStatus: (status: any) => void;
}

const ConnectModal: React.FC<ConnectModalProps> = ({
  providerId,
  providerName,
  setShowModal,
  setConnectedStatus,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`/api/integrations/validate${providerName}`, {
        apiKey,
      });

      if (response.data.success) {
        setConnectedStatus((prev: any) => ({ ...prev, [providerId]: true }));
        setShowModal(false);
      } else {
        setError("Invalid API Key. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Connect {providerName}</h2>
        <p>Enter your {providerName} API key below:</p>
        <input
          type="text"
          placeholder="Enter API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="api-input"
        />
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button onClick={() => setShowModal(false)} className="cancel-btn">
            Cancel
          </button>
          <button onClick={handleConnect} className="connect-btn" disabled={loading}>
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;
