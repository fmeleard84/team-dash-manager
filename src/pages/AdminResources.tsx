import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminResources() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Admin resources management page</p>
        </CardContent>
      </Card>
    </div>
  );
}