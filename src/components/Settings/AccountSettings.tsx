import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        
        <Button onClick={handleSignOut} variant="outline" className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnetti
        </Button>
      </CardContent>
    </Card>
  );
};

export default AccountSettings;
