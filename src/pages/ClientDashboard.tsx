import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientDashboard() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Client Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome to your client dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}