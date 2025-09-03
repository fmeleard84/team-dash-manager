import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MessagingDemo() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Messaging Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Messaging demo page</p>
        </CardContent>
      </Card>
    </div>
  );
}