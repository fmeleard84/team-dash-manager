import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartCard({ 
  title, 
  description, 
  children, 
  className,
  action 
}: ChartCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

// Chart theme colors
const CHART_COLORS = {
  brand: 'hsl(257, 85%, 58%)',
  success: 'hsl(158, 58%, 52%)',
  warning: 'hsl(42, 100%, 50%)',
  error: 'hsl(350, 89%, 60%)',
  info: 'hsl(199, 89%, 48%)',
  muted: 'hsl(220, 14%, 70%)',
};

const CHART_COLOR_PALETTE = [
  CHART_COLORS.brand,
  CHART_COLORS.success,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  CHART_COLORS.error,
  CHART_COLORS.muted,
];

interface SimpleBarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

export function SimpleBarChart({ 
  data, 
  dataKey, 
  xAxisKey,
  color = CHART_COLORS.brand,
  height = 300
}: SimpleBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="hsl(var(--fg))"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="hsl(var(--fg))"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
          }}
          labelStyle={{ color: 'hsl(var(--fg))' }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SimpleLineChartProps {
  data: any[];
  lines: Array<{
    dataKey: string;
    color?: string;
    name?: string;
  }>;
  xAxisKey: string;
  height?: number;
}

export function SimpleLineChart({ 
  data, 
  lines,
  xAxisKey,
  height = 300
}: SimpleLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="hsl(var(--fg))"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="hsl(var(--fg))"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
          }}
          labelStyle={{ color: 'hsl(var(--fg))' }}
        />
        <Legend />
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name || line.dataKey}
            stroke={line.color || CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface SimpleAreaChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

export function SimpleAreaChart({ 
  data, 
  dataKey, 
  xAxisKey,
  color = CHART_COLORS.brand,
  height = 300
}: SimpleAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="hsl(var(--fg))"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="hsl(var(--fg))"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
          }}
          labelStyle={{ color: 'hsl(var(--fg))' }}
        />
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          strokeWidth={2}
          fill="url(#colorGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface SimplePieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  height?: number;
}

export function SimplePieChart({ 
  data,
  height = 300
}: SimplePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill={CHART_COLORS.brand}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}