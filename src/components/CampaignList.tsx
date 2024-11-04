import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone,
  Users,
  Trash2,
  Plus,
  BarChart2,
  PieChart,
  Copy,
} from 'lucide-react';
import {
  getCampaigns,
  deleteCampaign,
  Campaign,
  addCampaign,
  getContacts,
  addContacts,
} from '../utils/db';

const CampaignList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchCampaigns = async () => {
    try {
      const fetchedCampaigns = await getCampaigns();
      setCampaigns(fetchedCampaigns);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaign(id);
        await fetchCampaigns();
      } catch (err) {
        console.error('Error deleting campaign:', err);
        setError('Failed to delete campaign. Please try again.');
      }
    }
  };

  const handleDuplicate = async (
    event: React.MouseEvent,
    campaign: Campaign
  ) => {
    event.stopPropagation();
    if (!campaign.id) return;

    try {
      setDuplicating(campaign.id);

      // Create new campaign with copied data
      const newCampaign: Omit<Campaign, 'id'> = {
        title: `${campaign.title} (Copy)`,
        description: campaign.description,
        agentId: campaign.agentId,
        outboundNumber: campaign.outboundNumber,
        status: 'Scheduled',
        progress: 0,
        hasRun: false,
        userId: campaign.userId,
      };

      // Add new campaign and get its ID
      const newCampaignId = await addCampaign(newCampaign);

      // Get contacts from original campaign
      const originalContacts = await getContacts(campaign.id);

      // Create new contacts for the duplicated campaign, including dynamicVariables
      if (originalContacts.length > 0) {
        const newContacts = originalContacts.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId: newCampaignId,
          dynamicVariables: contact.dynamicVariables, // Copy dynamicVariables as is
        }));

        await addContacts(newContacts);
      }

      // Refresh campaigns list
      await fetchCampaigns();
    } catch (err) {
      console.error('Error duplicating campaign:', err);
      setError('Failed to duplicate campaign. Please try again.');
    } finally {
      setDuplicating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-gradient-to-r from-green-400 to-green-600';
      case 'In Progress':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg shadow-md">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchCampaigns}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition duration-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 ml-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Your Campaigns</h1>
        <Link
          to="/create"
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-md hover:from-blue-600 hover:to-indigo-700 transition duration-300 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Create Campaign
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <p className="text-xl text-gray-600 mb-4">
            No campaigns found. Create a new campaign to get started!
          </p>
          <Link
            to="/create"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-md hover:from-blue-600 hover:to-indigo-700 transition duration-300 inline-flex items-center"
          >
            <Plus size={24} className="mr-2" />
            Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300 cursor-pointer"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 truncate">
                    {campaign.title}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 h-12 overflow-hidden">
                  {campaign.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>Contacts</span>
                  </div>
                  <div className="flex items-center">
                    <BarChart2 className="w-4 h-4 mr-1" />
                    <span>{campaign.progress}% Complete</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                <button
                  onClick={() => navigate(`/campaign/${campaign.id}`)}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  View Details
                </button>
                <button
                  onClick={() => navigate(`/campaign/${campaign.id}/analytics`)}
                  className="text-green-600 hover:text-green-800 font-medium flex items-center"
                >
                  <PieChart className="w-4 h-4 mr-1" />
                  Analytics
                </button>
                <button
                  onClick={(e) => handleDuplicate(e, campaign)}
                  disabled={duplicating === campaign.id}
                  className={`text-purple-600 hover:text-purple-800 flex items-center ${
                    duplicating === campaign.id
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title="Duplicate Campaign"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, campaign.id!)}
                  className="text-red-600 hover:text-red-800 flex items-center"
                  title="Delete Campaign"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignList;
