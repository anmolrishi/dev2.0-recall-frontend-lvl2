import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { getCallLogs, CallLog, getCampaign } from '../utils/db';
import {
  ArrowLeft,
  PhoneCall,
  Clock,
  ThumbsUp,
  ThumbsDown,
  X,
  ArrowDown,
  ArrowUp,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../utils/supabaseClient';

// Custom hook for fetching data
const useCampaignData = (id: string | undefined) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const [logs, campaign] = await Promise.all([
            getCallLogs(parseInt(id, 10)),
            getCampaign(parseInt(id, 10)),
          ]);
          setCallLogs(logs);
          setCampaignTitle(campaign?.title || 'Campaign');
        } catch (err) {
          console.error('Error fetching data:', err);
          setError('Failed to load campaign data. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [id]);

  return { callLogs, campaignTitle, loading, error };
};

// Custom components
const EnhancedCard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
    {children}
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <EnhancedCard>
    <div className="flex items-center justify-between">
      <div className="text-4xl font-bold" style={{ color }}>
        {value}
      </div>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="mt-2 text-gray-600">{label}</div>
  </EnhancedCard>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <EnhancedCard>
    <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
    <div className="h-[300px]">{children}</div>
  </EnhancedCard>
);

const CallLogTable: React.FC<{
  callLogs: CallLog[];
  onRowClick: (log: CallLog) => void;
}> = ({ callLogs, onRowClick }) => {
  const [sortedLogs, setSortedLogs] = useState<CallLog[]>(callLogs);
  const [sortConfig, setSortConfig] = useState<{
    key: 'call_duration';
    direction: 'asc' | 'desc' | null;
  }>({ key: 'call_duration', direction: null });

  useEffect(() => {
    setSortedLogs(callLogs);
  }, [callLogs]);

  const handleSort = () => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig({ key: 'call_duration', direction });

    let sortedData = [...sortedLogs];
    if (direction === null) {
      setSortedLogs(callLogs);
    } else {
      sortedData.sort((a, b) => {
        const aValue = a.call_duration || 0;
        const bValue = b.call_duration || 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      });
      setSortedLogs(sortedData);
    }
  };

  const handleExport = () => {
    // Prepare data for export
    const exportData = sortedLogs.map(log => ({
      'Phone Number': log.phoneNumber,
      'First Name': log.firstName,
      'Call ID': log.callId,
      'Disconnection Reason': log.disconnection_reason || 'N/A',
      'Duration (sec)': log.call_duration?.toFixed(2),
      'Sentiment': log.user_sentiment,
      'Start Time': log.start_time,
      'Call Summary': log.call_summary,
      'Call Transcript': log.call_transcript,
      'Call Recording URL': log.call_recording,
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Call Logs');
    
    // Generate file name with timestamp
    const fileName = `call_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Call Logs</h2>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
        >
          <Download size={18} className="mr-2" />
          Export to Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              {[
                "Phone Number",
                "First Name",
                "Call ID",
                "Disconnection Reason",
                {
                  label: "Duration",
                  sortable: true,
                },
                "Sentiment",
              ].map((header) => (
                <th
                  key={typeof header === 'string' ? header : header.label}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {typeof header === 'string' ? (
                    header
                  ) : (
                    <button
                      className="flex items-center space-x-1 hover:text-blue-600 transition-colors duration-200"
                      onClick={handleSort}
                    >
                      <span>{header.label}</span>
                      <span className="flex flex-col">
                        <ArrowUp
                          size={12}
                          className={`${
                            sortConfig.direction === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ArrowDown
                          size={12}
                          className={`${
                            sortConfig.direction === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLogs.map((log, index) => (
              <tr
                key={log.id || index}
                onClick={() => onRowClick(log)}
                className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.phoneNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {log.firstName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {log.callId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {log.disconnection_reason || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {log.call_duration?.toFixed(2)} sec
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {log.user_sentiment}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CallDetailsModal: React.FC<{
  callLog: CallLog | null;
  onClose: () => void;
}> = ({ callLog, onClose }) => {
  if (!callLog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Call Details</h2>
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Phone Number:</p>
            <p>{callLog.phoneNumber}</p>
          </div>
          <div>
            <p className="font-semibold">First Name:</p>
            <p>{callLog.firstName}</p>
          </div>
          <div>
            <p className="font-semibold">Call ID:</p>
            <p>{callLog.callId}</p>
          </div>
          <div>
            <p className="font-semibold">Disconnection Reason:</p>
            <p>{callLog.disconnection_reason || 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold">Start Time:</p>
            <p>{callLog.start_time || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Call Summary</h3>
            <p className="bg-gray-50 p-4 rounded-lg">
              {callLog.call_summary || 'No summary available'}
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Call Transcript</h3>
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg font-mono text-sm">
              {callLog.call_transcript || 'No transcript available'}
            </pre>
          </div>
          {callLog.call_recording && (
            <div>
              <h3 className="text-xl font-semibold mb-2">Call Recording</h3>
              <audio controls className="w-full">
                <source src={callLog.call_recording} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

const CustomPieChart: React.FC<{ data: { name: string; value: number }[] }> = ({
  data,
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

const CampaignAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { callLogs, campaignTitle, loading, error } = useCampaignData(id);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 bg-white p-4 rounded-lg shadow-md">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  // Calculate analytics data
  const totalCalls = callLogs.length;
  const answeredCalls = callLogs.filter(
    (log) => log.disconnection_reason === 'completed'
  ).length;
  const unansweredCalls = totalCalls - answeredCalls;
  const averageCallDuration =
    callLogs.reduce((sum, log) => {
      const duration = log.call_duration || 0;
      return sum + duration;
    }, 0) / totalCalls;

  // Prepare data for charts
  const disconnectionReasonData = callLogs.reduce((acc, log) => {
    const reason = log.disconnection_reason || 'Unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const disconnectionReasonChartData = Object.entries(
    disconnectionReasonData
  ).map(([name, value]) => ({ name, value }));

  const sentimentData = callLogs.reduce((acc, log) => {
    const sentiment = log.user_sentiment || 'Unknown';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sentimentChartData = Object.entries(sentimentData).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-4xl font-bold text-gray-800">
            {campaignTitle} Analytics
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<PhoneCall size={32} />}
            value={totalCalls}
            label="Total Calls"
            color="#0088FE"
          />
          <StatCard
            icon={<ThumbsUp size={32} />}
            value={answeredCalls}
            label="Answered Calls"
            color="#00C49F"
          />
          <StatCard
            icon={<ThumbsDown size={32} />}
            value={unansweredCalls}
            label="Unanswered Calls"
            color="#FF8042"
          />
          <StatCard
            icon={<Clock size={32} />}
            value={`${averageCallDuration.toFixed(2)} sec`}
            label="Avg. Call Duration"
            color="#FFBB28"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ChartCard title="Disconnection Reasons">
            <CustomPieChart data={disconnectionReasonChartData} />
          </ChartCard>

          <ChartCard title="User Sentiment">
            <CustomPieChart data={sentimentChartData} />
          </ChartCard>
        </div>

        <CallLogTable callLogs={callLogs} onRowClick={setSelectedCallLog} />
      </div>

      {selectedCallLog && (
        <CallDetailsModal
          callLog={selectedCallLog}
          onClose={() => setSelectedCallLog(null)}
        />
      )}
    </div>
  );
};

export default CampaignAnalytics;