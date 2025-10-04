import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RadarChartDataPoint {
    subject: string;
    scoreA: number;
    scoreB?: number;
    fullMark: number;
}
interface RadarChartProps {
  data: RadarChartDataPoint[];
  nameA?: string;
  nameB?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-2 rounded-md border border-cyan-500/50 backdrop-blur-sm">
        <p className="font-bold text-cyan-300">{`${label}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }} className="text-sm">
            {`${pld.name}: ${pld.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RadarChartComponent: React.FC<RadarChartProps> = ({ data, nameA, nameB }) => {
  const gridColor = '#22d3ee'; // cyan-400
  const textColor = '#9ca3af'; // gray-400
  const radarColorA = '#22d3ee'; // cyan-400
  const radarColorB = '#facc15'; // yellow-400

  const remappedData = data.map(d => ({...d, A: d.scoreA}));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={remappedData}>
        <PolarGrid stroke={gridColor} strokeOpacity={0.2}/>
        <PolarAngleAxis dataKey="subject" tick={{ fill: textColor, fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'transparent' }} />
        <Radar name={nameA || "分數"} dataKey="A" stroke={radarColorA} fill={radarColorA} fillOpacity={0.4} />
        {nameB && (
             <Radar name={nameB} dataKey="scoreB" stroke={radarColorB} fill={radarColorB} fillOpacity={0.4} />
        )}
        <Tooltip content={<CustomTooltip />} />
        {nameB && <Legend wrapperStyle={{fontSize: "12px"}}/>}
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default RadarChartComponent;
