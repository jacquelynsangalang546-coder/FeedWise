import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyPoint } from '../../types';
import { formatDayKey, formatPeso, formatPesoShort } from '../../utils/format';

interface RevenueChartProps {
  data: DailyPoint[];
  height?: number;
  showProfit?: boolean;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: DailyPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl bg-pasture-900 px-3.5 py-2.5 text-sm text-white shadow-pop">
      <p className="font-semibold">{label ? formatDayKey(label) : ''}</p>
      <p className="mt-1 tabular">Revenue {formatPeso(point.revenue)}</p>
      <p className="text-pasture-100/75 tabular">Profit {formatPeso(point.profit)}</p>
      <p className="text-pasture-100/75">
        {point.salesCount} sale{point.salesCount === 1 ? '' : 's'}
      </p>
    </div>
  );
}

// Daily revenue (and optionally profit) as bars
export function RevenueChart({ data, height = 260, showProfit = false }: RevenueChartProps) {
  const dense = data.length > 14;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#e3e8e0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayKey}
            tick={{ fontSize: 12, fill: '#637068' }}
            axisLine={false}
            tickLine={false}
            interval={dense ? 'preserveStartEnd' : 0}
            minTickGap={dense ? 24 : 4}
          />
          <YAxis
            tickFormatter={(value: number) => formatPesoShort(value).replace('.00', '')}
            tick={{ fontSize: 12, fill: '#637068' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(46,125,79,0.08)' }} />
          <Bar dataKey="revenue" name="Revenue" fill="#2e7d4f" radius={[6, 6, 0, 0]} maxBarSize={44} />
          {showProfit && <Bar dataKey="profit" name="Profit" fill="#f2c14e" radius={[6, 6, 0, 0]} maxBarSize={44} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
