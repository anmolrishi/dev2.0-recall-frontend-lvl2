import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  addCampaign,
  addContacts,
  Campaign,
  Contact,
  getUserRetellApiKey,
} from '../utils/db';
import { fetchAgents, fetchPhoneNumbers } from '../utils/retellApi';
import {
  FileText,
  User,
  Upload,
  AlertCircle,
  Phone,
  Info,
  Table,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../utils/supabaseClient';

interface Agent {
  agent_id: string;
  agent_name: string;
}

interface PhoneNumber {
  phone_number: string;
  phone_number_pretty: string;
  nickname?: string;
}

interface EnhancedContact extends Omit<Contact, 'id' | 'campaignId'> {
  dynamicVariables?: Record<string, string>;
}

const ExcelFormatExample = () => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Phone
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Gender
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Column_Name
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            11223344556
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            John
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            john@mail.com
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Male
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Value1
          </td>
        </tr>
        <tr>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            12334445678
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Mary
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            mary@mail.com
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Female
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            Value2
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const CampaignCreation: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [outboundNumber, setOutboundNumber] = useState('');
  const [contacts, setContacts] = useState<EnhancedContact[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const validateExcelColumns = (headers: string[]) => {
    // Check if any header contains spaces
    const headerWithSpace = headers.find((header) => header.includes(' '));
    if (headerWithSpace) {
      throw new Error(
        `Column title "${headerWithSpace}" contains spaces. Please remove all spaces from column titles.`
      );
    }

    // Check if first two columns are Phone and Name
    if (headers[0] !== 'Phone' || headers[1] !== 'Name') {
      throw new Error(
        'The first column must be titled "Phone" and the second column must be titled "Name".'
      );
    }

    return true;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          // Get headers and validate them
          const headers = data[0] as string[];
          validateExcelColumns(headers);

          // Process the data rows
          const parsedContacts: EnhancedContact[] = data
            .slice(1)
            .map((row: any) => {
              const contact: EnhancedContact = {
                phoneNumber: row[0]?.toString(),
                firstName: row[1]?.toString(),
                dynamicVariables: {},
              };

              // Add dynamic variables for additional columns
              headers.slice(2).forEach((header, index) => {
                if (row[index + 2] !== undefined) {
                  contact.dynamicVariables![header] =
                    row[index + 2]?.toString();
                }
              });

              return contact;
            })
            .filter((contact) => contact.phoneNumber && contact.firstName);

          setContacts(parsedContacts);
          setError('');
        } catch (err: any) {
          console.error('Error processing Excel file:', err);
          setError(err.message || 'Error processing Excel file');
          setContacts([]);
          setFileName('');
        }
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  useEffect(() => {
    const fetchRetellData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user found');

        const apiKey = await getUserRetellApiKey(user.id);
        if (!apiKey) {
          setError('Please set your Retell API key in settings first');
          setLoading(false);
          return;
        }

        const [fetchedAgents, fetchedNumbers] = await Promise.all([
          fetchAgents(apiKey),
          fetchPhoneNumbers(apiKey),
        ]);

        setAgents(fetchedAgents);
        setPhoneNumbers(fetchedNumbers);
      } catch (err) {
        console.error('Error fetching Retell data:', err);
        setError(
          'Failed to load Retell data. Please check your API key in settings.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRetellData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const campaign: Omit<Campaign, 'id'> = {
        title,
        description,
        agentId,
        outboundNumber,
        status: 'Scheduled',
        progress: 0,
        hasRun: false,
        userId: user.id,
      };

      const campaignId = await addCampaign(campaign);
      await addContacts(
        contacts.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
          campaignId,
          dynamicVariables: contact.dynamicVariables,
        }))
      );

      navigate(`/campaign/${campaignId}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError('Failed to create campaign. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        Create New Campaign
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Campaign Title
            </label>
            <div className="relative">
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="agentId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Agent
            </label>
            <div className="relative">
              <select
                id="agentId"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="mt-1 block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50"
                required
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.agent_id} value={agent.agent_id}>
                    {agent.agent_name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50"
            rows={3}
          ></textarea>
        </div>

        <div>
          <label
            htmlFor="outboundNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select Outbound Number
          </label>
          <div className="relative">
            <select
              id="outboundNumber"
              value={outboundNumber}
              onChange={(e) => setOutboundNumber(e.target.value)}
              className="mt-1 block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50"
              required
            >
              <option value="">Select a phone number</option>
              {phoneNumbers.map((number) => (
                <option key={number.phone_number} value={number.phone_number}>
                  {number.nickname
                    ? `${number.phone_number_pretty} (${number.nickname})`
                    : number.phone_number_pretty}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Upload Contacts (Excel file)
          </label>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Excel File Requirements:
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      The title of the first column in the file should be
                      "Phone," and the title of the second column should be
                      "Name."
                    </li>
                    <li>
                      The first column must contain valid phone numbers in
                      international format, without the plus symbol.
                    </li>
                    <li>
                      Data from any additional columns will be included as
                      dynamic variables in the outbound call.
                    </li>
                    <li>
                      There should be no spaces in the titles of any columns.
                    </li>
                  </ol>
                  <p className="mt-2 italic">
                    Note: For XLSX files, only the first sheet will be imported.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Table className="h-4 w-4 mr-2" />
              Example Excel Format:
            </h4>
            <ExcelFormatExample />
          </div>

          <div
            {...getRootProps()}
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 transition-all duration-300 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input {...getInputProps()} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">XLSX or XLS up to 10MB</p>
            </div>
          </div>
          {fileName && (
            <p className="mt-2 text-sm text-gray-600">
              Uploaded file: {fileName} ({contacts.length} contacts)
            </p>
          )}
        </div>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
          >
            Create Campaign
          </button>
        </div>
      </form>
    </div>
  );
};

export default CampaignCreation;
