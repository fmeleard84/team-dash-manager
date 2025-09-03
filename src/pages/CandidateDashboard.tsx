import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CandidateDashboard() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Candidate Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome to your candidate dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}