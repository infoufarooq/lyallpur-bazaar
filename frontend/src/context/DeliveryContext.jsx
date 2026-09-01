import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { FAISALABAD_LOCALITIES } from '../utils/constants';

const DeliveryContext = createContext();

export function DeliveryProvider({ children }) {
  const [selectedLocality, setSelectedLocality] = useState(() => {
    return localStorage.getItem('lyallpur_locality') || FAISALABAD_LOCALITIES[0];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    // Fetch active delivery zones
    client.get('/delivery/zones')
      .then((res) => setZones(res.data))
      .catch((err) => console.error("Error fetching delivery zones", err));
  }, []);

  useEffect(() => {
    // Refresh delivery estimate when locality changes
    client.post('/delivery/estimate', {
      locality: selectedLocality,
      subtotal_pkr: 0,
      delivery_speed: 'Standard Delivery'
    })
      .then((res) => setEstimate(res.data))
      .catch((err) => console.error("Error fetching delivery estimate", err));
  }, [selectedLocality]);

  const changeLocality = (locality) => {
    setSelectedLocality(locality);
    localStorage.setItem('lyallpur_locality', locality);
    setIsModalOpen(false);
  };

  return (
    <DeliveryContext.Provider value={{
      selectedLocality,
      changeLocality,
      isModalOpen,
      setIsModalOpen,
      zones,
      estimate
    }}>
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  return useContext(DeliveryContext);
}
