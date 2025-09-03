import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TemplateFlowSimple() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Template Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Template flow page</p>
        </CardContent>
      </Card>
    </div>
  );
}