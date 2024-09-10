import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

const TakeOrder = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState(null);
  const [takerHoldInvoice, setTakerHoldInvoice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderAndCreateInvoice();
      const intervalId = setInterval(() => checkHoldInvoiceStatus(), 5000);
      return () => clearInterval(intervalId);
    }
  }, [orderId]);

  const fetchOrderAndCreateInvoice = async () => {
    try {
      const orderResponse = await axios.get(`http://localhost:3000/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setOrder(orderResponse.data);

      const invoiceResponse = await axios.post(`http://localhost:3000/api/taker-invoice/${orderId}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('Taker hold invoice:', invoiceResponse.data.holdInvoice);
      setTakerHoldInvoice(invoiceResponse.data.holdInvoice);
    } catch (error) {
      console.error('Error fetching order or creating taker hold invoice:', error);
      setError('Failed to fetch order or create taker hold invoice');
    }
  };

  const checkHoldInvoiceStatus = async () => {
    try {
      const paymentHash = takerHoldInvoice?.payment_hash;
      if (!paymentHash) {
        console.error('No payment hash available for taker hold invoice');
        return;
      }
      
      console.log('Checking status for taker hold invoice payment hash:', paymentHash);
      
      const response = await axios.post(
        `http://localhost:3000/api/holdinvoicelookup`,
        { payment_hash: paymentHash },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      const invoiceState = response.data.state;
      setTakerHoldInvoice(prevState => ({
        ...prevState,
        status: invoiceState
      }));
  
      if (invoiceState === 'ACCEPTED') {
        console.log('Taker hold invoice has been paid!');
        // Handle paid state (e.g., show success message, update UI)
      }
    } catch (error) {
      console.error('Error checking taker hold invoice status:', error);
    }
  };
  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!order || !takerHoldInvoice) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Take Order</h1>
      <h2>Order Details</h2>
      <p>Order ID: {order.order_id}</p>
      <p>Amount: {order.amount_msat} msat</p>
      <p>Status: {order.status}</p>
      
      <h2>Taker Hold Invoice</h2>
      <p>Invoice: {takerHoldInvoice.bolt11}</p>
      <p>Amount: {takerHoldInvoice.amount_msat} msat</p>
      <p>Status: {takerHoldInvoice.status}</p>
      {takerHoldInvoice.status === 'ACCEPTED' && (
        <p>Hold invoice has been paid! Proceeding with the order...</p>
      )}
      <button onClick={() => checkHoldInvoiceStatus()}>
        Refresh Invoice Status
      </button>
    </div>
  );
};

export default TakeOrder;