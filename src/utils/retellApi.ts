import axios from 'axios';

interface Agent {
  agent_id: string;
  agent_name: string;
}

interface PhoneNumber {
  phone_number: string;
  phone_number_pretty: string;
  nickname?: string;
}

export const fetchAgents = async (apiKey: string): Promise<Agent[]> => {
  try {
    const response = await axios.get('https://api.retellai.com/list-agents', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.data.map((agent: any) => ({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name || agent.agent_id,
    }));
  } catch (error) {
    console.error('Error fetching agents:', error);
    throw error;
  }
};

export const fetchPhoneNumbers = async (apiKey: string): Promise<PhoneNumber[]> => {
  try {
    const response = await axios.get('https://api.retellai.com/list-phone-numbers', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.data.map((number: any) => ({
      phone_number: number.phone_number,
      phone_number_pretty: number.phone_number_pretty,
      nickname: number.nickname,
    }));
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    throw error;
  }
};