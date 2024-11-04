import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epklqvqohpibcgbilrxd.supabase.co';
const supabaseAnonKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwa2xxdnFvaHBpYmNnYmlscnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2OTY4NDQsImV4cCI6MjA0NDI3Mjg0NH0.qyBBF8ep2PZg59VfTHi-zQy8XavWyAqIYxjJ_a5l8wA`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
