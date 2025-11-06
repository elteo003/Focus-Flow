import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/dateUtils';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

const GoogleCalendarSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { addTimeBlock } = useTimeBlocks();
  const { user } = useAuth();

  // Check if user has token saved
  useEffect(() => {
    if (!user) return;
    
    const checkToken = async () => {
      const { data } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data && new Date(data.expires_at) > new Date()) {
        setIsConnected(true);
      }
    };
    
    checkToken();
  }, [user]);

  // Capture OAuth token from URL after redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') && user) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const expiresIn = parseInt(params.get('expires_in') || '3600');
      
      if (token) {
        const saveToken = async () => {
          const expiresAt = new Date(Date.now() + expiresIn * 1000);
          
          await supabase.from('google_tokens').upsert({
            user_id: user.id,
            access_token: token,
            expires_at: expiresAt.toISOString(),
            scope: GOOGLE_SCOPES,
          });
          
          setIsConnected(true);
          toast.success('Google Calendar connesso!');
          window.history.replaceState(null, '', window.location.pathname);
        };
        
        saveToken();
      }
    }
  }, [user]);

  const handleGoogleAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Configura VITE_GOOGLE_CLIENT_ID nelle impostazioni');
      return;
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', window.location.origin + '/');
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', GOOGLE_SCOPES);
    window.location.href = authUrl.toString();
  };

  const handleSync = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: tokenData } = await supabase
        .from('google_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokenData) {
        toast.error('Token non trovato. Riconnetti Google Calendar');
        setIsConnected(false);
        return;
      }

      const today = formatDate(new Date());
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: { accessToken: tokenData.access_token, date: today },
      });

      if (error) throw error;

      if (data.timeBlocks && data.timeBlocks.length > 0) {
        for (const block of data.timeBlocks) {
          await addTimeBlock(block);
        }
        toast.success(`${data.timeBlocks.length} eventi sincronizzati!`);
      } else {
        toast.info('Nessun evento trovato per oggi');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Errore durante la sincronizzazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Button onClick={handleGoogleAuth} className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Connetti Google Calendar
          </Button>
        ) : (
          <Button onClick={handleSync} disabled={isLoading} className="w-full">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Sincronizzazione...' : 'Sincronizza Ora'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarSync;
