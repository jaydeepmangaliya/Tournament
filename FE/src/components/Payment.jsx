import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useNavigate } from "react-router-dom";

const Payment = () => {
  const [status, setStatus] = useState("IDLE");
  const navigate = useNavigate();

  const upiUrl = `upi://pay?pa=yourupiid@bank&pn=Jaydeep&am=100&cu=INR`; // Replace with your actual UPI ID

  useEffect(() => {
    setStatus("WAITING");

    // Simulate payment verification after 30 seconds
    const timer = setTimeout(() => {
      const paymentSuccess = true; // Replace this with actual payment status check

      if (paymentSuccess) {
        setStatus("SUCCESS");
      } else {
        setStatus("FAILED");
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  // Redirect on success
  useEffect(() => {
    if (status === "SUCCESS") {
      setTimeout(() => {
        navigate("/tournaments");
      }, 2000);
    }
  }, [status, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Scan to Pay ₹100</h2>

        <div className="flex justify-center mb-4">
          <QRCode value={upiUrl} size={200} />
        </div>

        {status === "WAITING" && (
          <p className="text-yellow-600 mt-4 font-medium">Waiting for payment confirmation...</p>
        )}

        {status === "SUCCESS" && (
          <p className="text-green-600 mt-4 font-semibold">✅ Payment Successful! Redirecting...</p>
        )}

        {status === "FAILED" && (
          <p className="text-red-600 mt-4 font-semibold">❌ Payment Failed or Cancelled</p>
        )}
      </div>
    </div>
  );
};

export default Payment;
