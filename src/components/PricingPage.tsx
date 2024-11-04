import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  const handlePurchase = async (amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to purchase credits.');
      navigate('/auth');
      return;
    }

    const purchaseLink = `https://darwizpayment.edsplore.com/buy/36bdf86f-be25-4170-a5d1-14a702ac7351?checkout[custom][user_id]=${user.id}`;
    window.open(purchaseLink, '_blank');
  };

  const plans = [
    { name: 'Basic Caller', price: 25, calls: 5000, color: 'from-blue-400 to-blue-600' },
    { name: 'Professional Caller', price: 100, calls: 25000, color: 'from-purple-400 to-purple-600' },
    { name: 'Enterprise Caller', price: 500, calls: 150000, color: 'from-green-400 to-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Choose Your Retell-Powered Plan
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Select the perfect plan to power your Retell calling campaigns with Recall
          </p>
        </div>

        <div className="mt-16 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-x-8">
          {plans.map((plan) => (
            <div key={plan.name} className="relative">
              <div className="absolute inset-0 h-1/2 bg-gray-100"></div>
              <div className="relative p-8 bg-white rounded-lg shadow-lg">
                <div className={`rounded-md shadow-md p-6 bg-gradient-to-br ${plan.color}`}>
                  <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
                  <p className="mt-4 text-5xl font-extrabold text-white">${plan.price}</p>
                  <p className="mt-2 text-sm text-gray-100">USD / one-time</p>
                </div>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {plan.calls.toLocaleString()} Retell-powered calls
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Full Retell campaign analytics
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    24/7 Retell support
                  </li>
                </ul>
                <div className="mt-8">
                  <button
                    onClick={() => handlePurchase(plan.price)}
                    className={`w-full bg-gradient-to-r ${plan.color} text-white rounded-md px-4 py-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-${plan.color.split('-')[1]}-500 transition-all duration-150 ease-in-out`}
                  >
                    Purchase Plan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;