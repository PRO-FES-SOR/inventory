export default function KPICards({ data }: { data: any }) {
  const kpis = [
    { label: 'Processed', value: data?.processed ?? 0 },
    { label: 'Shipped', value: data?.shipped ?? 0 },
    { label: 'In Transit', value: data?.in_transit ?? 0 },
    { label: 'Delivered', value: data?.delivered ?? 0 },
    { label: 'Low Stock', value: data?.low_stock ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-2xl border border-neutral-800 p-4 text-center shadow">
          <div className="text-2xl font-bold">{k.value}</div>
          <div className="text-neutral-400">{k.label}</div>
        </div>
      ))}
    </div>
  );
}
