import { supabase } from './supabaseClient';

export interface Contact {
  id?: number;
  campaignId: number;
  phoneNumber: string;
  firstName: string;
  callId?: string;
}

export interface Campaign {
  id?: number;
  title: string;
  description: string;
  agentId: string;
  outboundNumber: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  progress: number;
  hasRun: boolean;
  userId: string;
}

export interface CallLog {
  id?: number;
  campaignId: number;
  phoneNumber: string;
  firstName: string;
  callId: string;
  disconnection_reason?: string;
  call_transcript?: string;
  call_summary?: string;
  call_recording?: string;
  start_time?: string;
}

export interface UserDialingCredits {
  userId: string;
  email: string;
  dialing_credits: number;
  retell_api_key: string;
}

export async function addCampaign(
  campaign: Omit<Campaign, 'id'>
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{ ...campaign, hasRun: false }])
      .select();

    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error('No data returned from insert');

    return data[0].id;
  } catch (error) {
    console.error('Error adding campaign:', error);
    throw error;
  }
}

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('userId', userData.user.id);

    if (error) throw error;
    if (!data) return [];

    return data;
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('userId', userData.user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    throw error;
  }
}

export async function addContacts(
  contacts: Omit<Contact, 'id'>[]
): Promise<void> {
  try {
    const { error } = await supabase.from('contacts').insert(contacts);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding contacts:', error);
    throw error;
  }
}

export async function getContacts(campaignId: number): Promise<Contact[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaignId', campaignId);

    if (error) throw error;
    if (!data) return [];

    return data;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

export async function updateCampaign(
  id: number,
  updates: Partial<Campaign>
): Promise<Campaign> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from update');

    return data;
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
}

export async function updateContact(
  id: number,
  updates: Partial<Contact>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
}

export async function addCallLog(callLog: Omit<CallLog, 'id'>): Promise<void> {
  try {
    const { error } = await supabase.from('call_logs').insert([callLog]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding call log:', error);
    throw error;
  }
}

export async function getCallLogs(campaignId: number): Promise<CallLog[]> {
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('campaignId', campaignId);

    if (error) throw error;
    if (!data) return [];

    return data;
  } catch (error) {
    console.error('Error fetching call logs:', error);
    throw error;
  }
}

export async function deleteCampaign(id: number): Promise<void> {
  try {
    // First, delete all contacts associated with the campaign
    const { error: contactsError } = await supabase
      .from('contacts')
      .delete()
      .eq('campaignId', id);

    if (contactsError) throw contactsError;

    // Then, delete all call logs associated with the campaign
    const { error: callLogsError } = await supabase
      .from('call_logs')
      .delete()
      .eq('campaignId', id);

    if (callLogsError) throw callLogsError;

    // Finally, delete the campaign
    const { error: campaignError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (campaignError) throw campaignError;
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
}

export async function updateCallLog(
  id: number,
  updates: Partial<CallLog>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating call log:', error);
    throw error;
  }
}

export async function getUserDialingCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_dialing_credits')
      .select('dialing_credits')
      .eq('userId', userId)
      .single();

    if (error) throw error;
    return data?.dialing_credits || 0;
  } catch (error) {
    console.error('Error fetching user dialing credits:', error);
    throw error;
  }
}

export async function getUserRetellApiKey(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_dialing_credits')
      .select('retell_api_key')
      .eq('userId', userId)
      .single();

    if (error) throw error;
    return data?.retell_api_key || null;
  } catch (error) {
    console.error('Error fetching Retell API key:', error);
    throw error;
  }
}

export async function updateUserDialingCredits(userId: string, credits: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_dialing_credits')
      .upsert({
        userId: userId,
        dialing_credits: credits
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user dialing credits:', error);
    throw error;
  }
}

export async function updateUserRetellApiKey(userId: string, apiKey: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_dialing_credits')
      .update({ retell_api_key: apiKey })
      .eq('userId', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating Retell API key:', error);
    throw error;
  }
}