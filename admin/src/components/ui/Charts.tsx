import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyPoint } from '@/mock/analytics';

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #E2E2DC',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,26,46,.12)',
};

export function TrendArea({ data, color = '#F4511E', height = 220 }: { data: DailyPoint[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EEEEE9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#8A93A3' }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis tick={{ fontSize: 10, fill: '#8A93A3' }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 700, color: '#0F1A2E' }} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
  height = 220,
  color = '#0F1A2E',
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} layout="vertical">
        <CartesianGrid horizontal={false} stroke="#EEEEE9" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#8A93A3' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#3A4557' }} axisLine={false} tickLine={false} width={110} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#F4F4F1' }} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#F4511E', '#0F1A2E', '#E0A106', '#0E9469', '#2E4A70', '#8A6300'];

export function SimplePieChart({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
