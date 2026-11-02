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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050507] text-[#e4e4e7] p-4 pt-24 pb-16">
      <div className="bg-[#0c0c10] border border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-white">Scan to Pay <span className="text-silver">₹100</span></h2>
        <p className="text-xs text-zinc-400">Scan via PhonePe, Google Pay, Paytm or any UPI App</p>

        <div className="flex justify-center p-4 bg-white rounded-2xl max-w-[230px] mx-auto shadow-inner">
          <QRCode value={upiUrl} size={180} />
        </div>

        {status === "WAITING" && (
          <p className="text-zinc-400 text-xs font-mono animate-pulse">Waiting for UPI payment confirmation...</p>
        )}

        {status === "SUCCESS" && (
          <p className="text-zinc-200 mt-4 font-semibold text-xs uppercase tracking-wider bg-zinc-900 border border-zinc-700 py-2.5 rounded-xl">
            Payment Confirmed. Redirecting...
          </p>
        )}

        {status === "FAILED" && (
          <p className="text-red-400 mt-4 font-semibold text-xs uppercase tracking-wider bg-red-950/40 border border-red-800 py-2.5 rounded-xl">
            Payment Unsuccessful or Cancelled
          </p>
        )}
      </div>
    </div>
  );
};

export default Payment;
