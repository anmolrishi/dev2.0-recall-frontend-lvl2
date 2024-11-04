import React, { useState, useEffect } from 'react';
import { Key, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { updateUserRetellApiKey } from '../utils/db';

const Settings: React.FC = () => {
  const [retellApiKey, setRetellApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user found');

        const { data, error } = await supabase
          .from('user_dialing_credits')
          .select('retell_api_key')
          .eq('userId', user.id)
          .single();

        if (error) throw error;
        if (data?.retell_api_key) {
          setRetellApiKey(data.retell_api_key);
        }
      } catch (err) {
        console.error('Error fetching API key:', err);
        setError('Failed to load API key');
      }
    };

    fetchApiKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      await updateUserRetellApiKey(user.id, retellApiKey);
      setSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating API key:', err);
      setError('Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Settings</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="retellApiKey" className="block text-sm font-medium text-gray-700 mb-2">
              Retell API Key
            </label>
            <div className="relative">
              <input
                type="text"
                id="retellApiKey"
                value={retellApiKey}
                onChange={(e) => setRetellApiKey(e.target.value)}
                className="mt-1 block w-full pl-10 pr-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your Retell API Key"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-sm text-green-700">API key updated successfully!</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                'Updating...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;