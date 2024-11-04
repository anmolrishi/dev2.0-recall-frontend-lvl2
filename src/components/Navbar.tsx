import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PhoneCall, LogOut, CreditCard, PlusCircle, LayoutDashboard, Menu, ChevronLeft, Settings } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { getUserDialingCredits } from '../utils/db';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dialingCredits, setDialingCredits] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchDialingCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const credits = await getUserDialingCredits(user.id);
        setDialingCredits(credits);
      }
    };

    fetchDialingCredits();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/campaigns', icon: <LayoutDashboard size={20} />, text: 'Campaigns' },
    { path: '/create', icon: <PlusCircle size={20} />, text: 'Create Campaign' },
    { path: '/pricing', icon: <CreditCard size={20} />, text: 'Add Credits' },
    { path: '/settings', icon: <Settings size={20} />, text: 'Settings' },
  ];

  return (
    <>
      <nav className={`bg-gradient-to-b from-white to-gray-100 text-gray-800 h-screen fixed top-0 left-0 z-50 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-16'} shadow-lg`}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between">
            {isExpanded && <span className="text-xl font-bold text-blue-600">Recall</span>}
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200">
              {isExpanded ? <ChevronLeft size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <div className="flex-grow">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center p-4 hover:bg-blue-50 transition-colors duration-200 ${location.pathname === item.path ? 'bg-blue-100 text-blue-600' : ''}`}
              >
                {item.icon}
                {isExpanded && <span className="ml-4">{item.text}</span>}
              </Link>
            ))}
          </div>
          <div className="p-4">
            {isExpanded ? (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 shadow-inner">
                <h3 className="text-sm font-semibold text-blue-600 mb-1">Available Credits</h3>
                <p className="text-2xl font-bold text-blue-800">
                  {dialingCredits !== null ? dialingCredits.toLocaleString() : 'Loading...'}
                </p>
              </div>
            ) : (
              <div className="mb-4 text-center">
                <PhoneCall size={20} className="mx-auto text-blue-600" />
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full p-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors duration-200"
            >
              <LogOut size={20} />
              {isExpanded && <span className="ml-2">Logout</span>}
            </button>
          </div>
        </div>
      </nav>
      <div className={`transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-16'}`}>
        {/* This is where the main content will be rendered */}
      </div>
    </>
  );
};

export default Navbar;