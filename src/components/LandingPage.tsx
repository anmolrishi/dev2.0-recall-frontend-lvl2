import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, BarChart2, Users, Clock, DollarSign, Zap } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white bg-opacity-90 shadow-md sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-3 max-w-5xl">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">Recall</div>
            <div className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition duration-300">Features</a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 transition duration-300">Benefits</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition duration-300">Pricing</a>
            </div>
            <Link to="/auth" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300">Log In</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        <section className="py-16 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 leading-tight">
            Revolutionize Your Outbound Calling
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8">
            Recall: The ultimate outbound calling manager for Retell, designed for modern businesses
          </p>
          <Link
            to="/auth"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold px-8 py-3 rounded-full hover:shadow-lg transform hover:-translate-y-1 transition duration-300"
          >
            Get Started
          </Link>
        </section>

        <section id="features" className="bg-white py-16 rounded-lg shadow-md">
          <div className="px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Recall for Retell?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: <Phone className="w-12 h-12 text-blue-600" />, title: "Efficient Dialing", description: "Automate your Retell-powered outbound calls and increase productivity" },
                { icon: <BarChart2 className="w-12 h-12 text-blue-600" />, title: "Advanced Analytics", description: "Gain insights with detailed call analytics and reporting for Retell calls" },
                { icon: <Users className="w-12 h-12 text-blue-600" />, title: "Team Collaboration", description: "Seamlessly manage and coordinate your Retell calling teams" },
                { icon: <Clock className="w-12 h-12 text-blue-600" />, title: "Time-Saving", description: "Reduce manual work and focus on meaningful Retell conversations" },
              ].map((feature, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 shadow-md hover:shadow-lg transition duration-300">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="bg-gradient-to-br from-blue-100 to-indigo-100 py-16 mt-16 rounded-lg shadow-md">
          <div className="px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Powerful Benefits for Your Retell-Powered Business</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="flex justify-center mb-4">
                  <Zap className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
                <p className="text-gray-600">Our intuitive platform ensures a smooth experience for all Retell users, regardless of technical expertise.</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="flex justify-center mb-4">
                  <DollarSign className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cost-Effective</h3>
                <p className="text-gray-600">Save money on your Retell-powered outbound calling campaigns with our efficient and affordable solutions.</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="flex justify-center mb-4">
                  <BarChart2 className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Super Heavy Analytics</h3>
                <p className="text-gray-600">Gain deep insights into your Retell campaigns with our powerful analytics tools, driving better decision-making.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16">
          <div className="px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing for Retell Campaigns</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "Basic Caller", price: 25, calls: 5000, color: "from-blue-400 to-blue-600" },
                { name: "Professional Caller", price: 100, calls: 25000, color: "from-indigo-400 to-indigo-600" },
                { name: "Enterprise Caller", price: 500, calls: 150000, color: "from-purple-400 to-purple-600" },
              ].map((plan, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${plan.color} text-white p-6`}>
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                    <div className="text-4xl font-bold mt-2">${plan.price}</div>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-4">
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {plan.calls.toLocaleString()} Retell-powered calls
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Advanced Retell analytics
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        24/7 Retell support
                      </li>
                    </ul>
                    <Link
                      to="/auth"
                      className={`mt-6 block w-full bg-gradient-to-r ${plan.color} text-white text-center py-2 rounded-md hover:opacity-90 transition duration-300`}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-2xl font-bold">Recall</div>
              <div className="text-sm">© 2023 Recall. All rights reserved.</div>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-blue-400 transition duration-300">Privacy Policy</a>
              <a href="#" className="hover:text-blue-400 transition duration-300">Terms of Service</a>
              <a href="#" className="hover:text-blue-400 transition duration-300">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;