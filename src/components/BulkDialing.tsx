import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X, BarChart2, PieChart } from 'lucide-react';
import {
  getCampaign,
  getContacts,
  getCallLogs,
  getUserDialingCredits,
  Campaign,
  Contact,
  CallLog,
} from '../utils/db';
import { supabase } from '../utils/supabaseClient';

// Interface definitions
interface ConcurrencyStatus {
  current_concurrency: number;
  concurrency_limit: number;
}

interface CallDetails {
  disconnection_reason: string;
  call_transcript: string;
  call_summary: string;
  call_recording: string;
  start_time: string;
}

// ContactsPopup component
interface ContactsPopupProps {
  setShowContactsPopup: (value: boolean) => void;
  contacts: Contact[];
}

const ContactsPopup: React.FC<ContactsPopupProps> = ({
  setShowContactsPopup,
  contacts,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowContactsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowContactsPopup]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={popupRef}
        className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] relative flex flex-col"
      >
        <button
          onClick={() => setShowContactsPopup(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4">Campaign Contacts</h2>
        <div ref={scrollContainerRef} className="overflow-y-auto flex-grow">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">First Name</th>
                <th className="px-4 py-2 text-left">Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, index) => (
                <tr key={contact.id || index} className="border-b">
                  <td className="px-4 py-2">{contact.firstName}</td>
                  <td className="px-4 py-2">{contact.phoneNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BulkDialing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dialingStatus, setDialingStatus] = useState<
    'idle' | 'dialing' | 'paused' | 'completed'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showContactsPopup, setShowContactsPopup] = useState(false);
  const [concurrencyStatus, setConcurrencyStatus] =
    useState<ConcurrencyStatus | null>(null);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [purchaseLink, setPurchaseLink] = useState<string | null>(null);

  const getConcurrencyStatus = useCallback(
    async (retellApiKey: string): Promise<ConcurrencyStatus | null> => {
      try {
        const response = await axios.get(
          'https://api.retellai.com/get-concurrency',
          {
            headers: {
              Authorization: `Bearer ${retellApiKey}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching concurrency status:', error);
        return null;
      }
    },
    []
  );

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsPolling(true);
    pollingIntervalRef.current = setInterval(async () => {
      if (campaign) {
        try {
          const updatedCampaign = await getCampaign(campaign.id!);
          if (updatedCampaign) {
            setCampaign(updatedCampaign);
            setProgress(updatedCampaign.progress);

            if (updatedCampaign.status === 'Completed') {
              setDialingStatus('completed');
              stopPolling();
            }
          }
        } catch (error) {
          console.error('Error fetching campaign progress:', error);
        }
      }
    }, 2000); // Poll every 2 seconds
  }, [campaign, stopPolling]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateConcurrencyStatus = async () => {
      if (campaign && campaign.retellApiKey) {
        const status = await getConcurrencyStatus(campaign.retellApiKey);
        if (status) {
          setConcurrencyStatus(status);
        }
      }
    };

    if (campaign && campaign.retellApiKey) {
      updateConcurrencyStatus(); // Initial update
      intervalId = setInterval(updateConcurrencyStatus, 1000); // Update every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [campaign, getConcurrencyStatus]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const startBulkDialing = useCallback(async () => {
    if (!campaign || !contacts.length) return;
    if (campaign.hasRun && campaign.status === 'Completed') {
      alert('This campaign has already been run and cannot be run again.');
      return;
    }
    setDialingStatus('dialing');
    console.log(`Starting bulk dialing for ${contacts.length} contacts`);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        'https://1718c2e2-bb7f-4742-9f8c-aa25aae8b08a-00-y2j97vfi0dja.sisko.replit.dev/api/start-bulk-dialing',
        {
          campaignId: campaign.id,
          userId: user.id,
        }
      );

      if (response.data.success) {
        startPolling(); // Start polling for progress updates
      } else {
        throw new Error(response.data.error || 'Bulk dialing failed');
      }
    } catch (error) {
      console.error('Error during bulk dialing:', error);
      setDialingStatus('idle');
      if (error.response && error.response.status === 402) {
        setPurchaseLink(error.response.data.purchaseLink);
        // alert('Insufficient dialing credits. Please purchase more credits to continue.');
      } else {
        alert('An error occurred during bulk dialing. Please try again.');
      }
    }
  }, [campaign, contacts, startPolling]);

  useEffect(() => {
    const fetchUserCredits = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const credits = await getUserDialingCredits(user.id);
        setUserCredits(credits);
      }
    };

    fetchUserCredits();
  }, []);

  const pauseOrResumeCampaign = useCallback(async () => {
    if (!campaign) return;

    const newStatus = campaign.status === 'Paused' ? 'In Progress' : 'Paused';

    try {
      const response = await axios.post(
        'https://1718c2e2-bb7f-4742-9f8c-aa25aae8b08a-00-y2j97vfi0dja.sisko.replit.dev/api/update-campaign-status',
        {
          campaignId: campaign.id,
          status: newStatus,
        }
      );

      if (response.data.success) {
        setCampaign((prevCampaign) =>
          prevCampaign ? { ...prevCampaign, status: newStatus } : prevCampaign
        );
        if (newStatus === 'Paused') {
          setDialingStatus('paused');
        } else {
          setDialingStatus('dialing');
        }
      } else {
        throw new Error(
          response.data.error || 'Failed to update campaign status'
        );
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      alert('An error occurred while updating the campaign status.');
    }
  }, [campaign]);

  useEffect(() => {
    const loadCampaignData = async () => {
      if (id) {
        try {
          const campaignData = await getCampaign(parseInt(id, 10));
          if (campaignData) {
            setCampaign(campaignData);
            setProgress(campaignData.progress);
            const contactsData = await getContacts(campaignData.id!);
            setContacts(contactsData);
            const callLogsData = await getCallLogs(campaignData.id!);
            setCallLogs(callLogsData);
            console.log(`Loaded campaign with ${contactsData.length} contacts`);

            const {
              data: { user },
            } = await supabase.auth.getUser();

            // Start polling if the campaign is in progress
            if (campaignData.status === 'In Progress') {
              setDialingStatus('dialing');
              startPolling();
              if (user) {
                const credits = await getUserDialingCredits(user.id);
                setUserCredits(credits);
              }
            } else if (campaignData.status === 'Paused') {
              setDialingStatus('paused');
              startPolling();
              if (user) {
                const credits = await getUserDialingCredits(user.id);
                setUserCredits(credits);
              }
            } else if (campaignData.status === 'Completed') {
              setDialingStatus('completed');
              if (user) {
                const credits = await getUserDialingCredits(user.id);
                setUserCredits(credits);
              }
            }
          } else {
            setError('Campaign not found');
          }
        } catch (err) {
          setError('Error loading campaign data');
          console.error('Error loading campaign data:', err);
        }
      }
    };
    loadCampaignData();
  }, [id, startPolling]);

  const analyzeCallLogs = useCallback(async () => {
    if (!campaign) return;
    setIsAnalyzing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await axios.post(
        'https://1718c2e2-bb7f-4742-9f8c-aa25aae8b08a-00-y2j97vfi0dja.sisko.replit.dev/api/analyze-call-logs',
        {
          campaignId: campaign.id,
          userId: user.id,
        }
      );

      if (response.data.success) {
        setCallLogs(response.data.callLogs);
      } else {
        throw new Error(response.data.error || 'Call log analysis failed');
      }
    } catch (error) {
      console.error('Error during call log analysis:', error);
      alert('An error occurred during call log analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [campaign]);

  const handleCallLogClick = (log: CallLog) => {
    setSelectedCallLog(log);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Bulk Dialing</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {campaign ? (
        <>
          <h2 className="text-xl font-semibold mb-2">{campaign.title}</h2>
          <p className="mb-4">{campaign.description}</p>
          <p className="mb-2">Status: {campaign.status}</p>
          <p className="mb-2">Total Contacts: {contacts.length}</p>
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Progress: {progress}%</p>
          </div>
          {concurrencyStatus && (
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Concurrency Status</h3>
              <p>
                Current Concurrency: {concurrencyStatus.current_concurrency}
              </p>
              <p>Concurrency Limit: {concurrencyStatus.concurrency_limit}</p>
            </div>
          )}
          <p className="mb-2">
            Available Credits:{' '}
            {userCredits !== null ? userCredits : 'Loading...'}
          </p>
          <div className="flex space-x-4 mb-4">
            {dialingStatus === 'idle' && !campaign.hasRun && (
              <button
                onClick={startBulkDialing}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Start Bulk Dialing
              </button>
            )}
            {(dialingStatus === 'dialing' || dialingStatus === 'paused') && (
              <button
                onClick={pauseOrResumeCampaign}
                className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
              >
                {dialingStatus === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )}
            <button
              onClick={() => setShowContactsPopup(true)}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              View Contacts
            </button>
            <button
              onClick={() => navigate(`/campaign/${campaign.id}/analytics`)}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <PieChart size={20} className="mr-2" />
              View Analytics
            </button>
          </div>
          {purchaseLink && (
            <div className="mb-4">
              <p className="text-red-500">
                Insufficient credits. Please purchase more to continue.
              </p>
              <a
                href={purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-block mt-2"
              >
                Purchase Credits
              </a>
            </div>
          )}
          {campaign.hasRun && campaign.status === 'Completed' && (
            <p className="text-yellow-600 mb-4">
              This campaign has already been run and cannot be run again.
            </p>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Call Logs</h3>
            <button
              onClick={analyzeCallLogs}
              disabled={isAnalyzing}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <BarChart2 size={20} className="mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Calls'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Phone Number</th>
                  <th className="px-4 py-2">First Name</th>
                  <th className="px-4 py-2">Call ID</th>
                  <th className="px-4 py-2">Disconnection Reason</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.map((log, index) => (
                  <tr
                    key={log.id || index}
                    className={`${
                      index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                    } cursor-pointer hover:bg-gray-200`}
                    onClick={() => handleCallLogClick(log)}
                  >
                    <td className="border px-4 py-2">{log.phoneNumber}</td>
                    <td className="border px-4 py-2">{log.firstName}</td>
                    <td className="border px-4 py-2">{log.callId}</td>
                    <td className="border px-4 py-2">
                      {log.disconnection_reason || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedCallLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
                <button
                  onClick={() => setSelectedCallLog(null)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
                <h2 className="text-2xl font-bold mb-4">Call Details</h2>
                <p>
                  <strong>Phone Number:</strong> {selectedCallLog.phoneNumber}
                </p>
                <p>
                  <strong>First Name:</strong> {selectedCallLog.firstName}
                </p>
                <p>
                  <strong>Call ID:</strong> {selectedCallLog.callId}
                </p>
                <p>
                  <strong>Disconnection Reason:</strong>{' '}
                  {selectedCallLog.disconnection_reason || 'N/A'}
                </p>
                <p>
                  <strong>Start Time:</strong>{' '}
                  {selectedCallLog.start_time || 'N/A'}
                </p>
                <h3 className="text-xl font-semibold mt-4 mb-2">
                  Call Summary
                </h3>
                <p>{selectedCallLog.call_summary || 'No summary available'}</p>
                <h3 className="text-xl font-semibold mt-4 mb-2">
                  Call Transcript
                </h3>
                <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">
                  {selectedCallLog.call_transcript || 'No transcript available'}
                </pre>
                {selectedCallLog.call_recording && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-2">
                      Call Recording
                    </h3>
                    <audio controls src={selectedCallLog.call_recording}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          )}
          {showContactsPopup && (
            <ContactsPopup
              setShowContactsPopup={setShowContactsPopup}
              contacts={contacts}
            />
          )}
        </>
      ) : (
        <p>Loading campaign data...</p>
      )}
    </div>
  );
};

export default BulkDialing;
